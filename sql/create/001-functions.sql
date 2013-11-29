SET client_encoding = 'UTF8';
SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION hash(bigint) RETURNS text AS
$$
DECLARE
    sha1 text;
    i integer;
    v integer;
    c char;
    res text;
BEGIN

    SELECT INTO sha1 ('x' || right(digest($1::text, 'sha1')::text, 40))::bit(160);

    res := '';

    i := 0;
    WHILE i < 16 LOOP
        SELECT INTO v substring(sha1 from (6*i)+1 for 6)::bit(6)::integer;
        CASE v
            WHEN 0 THEN c := '0'; WHEN 1 THEN c := '1'; WHEN 2 THEN c := '2'; WHEN 3 THEN c := '3';
            WHEN 4 THEN c := '4'; WHEN 5 THEN c := '5'; WHEN 6 THEN c := '6'; WHEN 7 THEN c := '7';
            WHEN 8 THEN c := '8'; WHEN 9 THEN c := '9'; WHEN 10 THEN c := 'A'; WHEN 11 THEN c := 'B';
            WHEN 12 THEN c := 'C'; WHEN 13 THEN c := 'D'; WHEN 14 THEN c := 'E'; WHEN 15 THEN c := 'F';
            WHEN 16 THEN c := 'G'; WHEN 17 THEN c := 'H'; WHEN 18 THEN c := 'I'; WHEN 19 THEN c := 'J';
            WHEN 20 THEN c := 'K'; WHEN 21 THEN c := 'L'; WHEN 22 THEN c := 'M'; WHEN 23 THEN c := 'N';
            WHEN 24 THEN c := 'O'; WHEN 25 THEN c := 'P'; WHEN 26 THEN c := 'Q'; WHEN 27 THEN c := 'R';
            WHEN 28 THEN c := 'S'; WHEN 29 THEN c := 'T'; WHEN 30 THEN c := 'U'; WHEN 31 THEN c := 'V';
            WHEN 32 THEN c := 'W'; WHEN 33 THEN c := 'X'; WHEN 34 THEN c := 'Y'; WHEN 35 THEN c := 'Z';
            WHEN 36 THEN c := 'a'; WHEN 37 THEN c := 'b'; WHEN 38 THEN c := 'c'; WHEN 39 THEN c := 'd';
            WHEN 40 THEN c := 'e'; WHEN 41 THEN c := 'f'; WHEN 42 THEN c := 'g'; WHEN 43 THEN c := 'h';
            WHEN 44 THEN c := 'i'; WHEN 45 THEN c := 'j'; WHEN 46 THEN c := 'k'; WHEN 47 THEN c := 'l';
            WHEN 48 THEN c := 'm'; WHEN 49 THEN c := 'n'; WHEN 50 THEN c := 'o'; WHEN 51 THEN c := 'p';
            WHEN 52 THEN c := 'q'; WHEN 53 THEN c := 'r'; WHEN 54 THEN c := 's'; WHEN 55 THEN c := 't';
            WHEN 56 THEN c := 'u'; WHEN 57 THEN c := 'v'; WHEN 58 THEN c := 'w'; WHEN 59 THEN c := 'x';
            WHEN 60 THEN c := 'y'; WHEN 61 THEN c := 'z'; WHEN 62 THEN c := '-'; WHEN 63 THEN c := '_';
        END CASE;
        res := res || c;
        i := i + 1;
    END LOOP;

    RETURN res;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION nexthash() RETURNS text AS
$$
    SELECT hash(nextval('hash_seq'));
$$
LANGUAGE SQL;

CREATE OR REPLACE FUNCTION nextsha1() RETURNS text AS
$$
    SELECT right(digest(nextval('sha1_seq')::text, 'sha1')::text, 40);
$$
LANGUAGE SQL;

CREATE OR REPLACE FUNCTION has_permission(_user_id integer,
                                          _exp_id integer,
                                          _type text default 'read') RETURNS boolean AS
$$
BEGIN
    CASE _type
        WHEN 'read' THEN
            PERFORM e.id
                FROM experiments e
                WHERE e.id = _exp_id AND e.owner = _user_id
            UNION
            SELECT up.exp_id
                FROM experiment_user_permissions up
                WHERE up.user_id = _user_id AND up.exp_id = _exp_id AND up.read = true
            UNION
            SELECT gp.exp_id
                FROM user_groups g, experiment_group_permissions gp
                WHERE g.user_id = _user_id AND gp.group_id = g.group_id AND gp.exp_id = _exp_id AND
                gp.read = true;
        WHEN 'write' THEN
            PERFORM e.id
                FROM experiments e
                WHERE e.id = _exp_id AND e.owner = _user_id
            UNION
            SELECT up.exp_id
                FROM experiment_user_permissions up
                WHERE up.user_id = _user_id AND up.exp_id = _exp_id AND up.write = true
            UNION
            SELECT gp.exp_id
                FROM user_groups g, experiment_group_permissions gp
                WHERE g.user_id = _user_id AND gp.group_id = g.group_id AND gp.exp_id = _exp_id AND
                gp.write = true;
        ELSE
            RETURN false;
    END CASE;

    RETURN FOUND;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION create_experiment(_name text,
                                             _owner integer,
                                             _base integer)
RETURNS integer AS $$
DECLARE
    _exp_id integer;
    _chart_id integer;
BEGIN
    INSERT INTO experiments (name, owner) VALUES (_name, _owner) RETURNING id INTO _exp_id;

    IF _base IS NOT NULL THEN
        INSERT INTO experiment_user_permissions (exp_id, user_id, read, write) (
            SELECT _exp_id, user_id, read, write
                FROM experiment_user_permissions
                WHERE exp_id=_base
        );

        INSERT INTO experiment_group_permissions (exp_id, group_id, read, write) (
            SELECT _exp_id, group_id, read, write
                FROM experiment_group_permissions
                WHERE exp_id=_base
        );

        INSERT INTO experiment_parameters (exp_id, name, type) (
            SELECT _exp_id, name, type
                FROM experiment_parameters
                WHERE exp_id=_base
        );

        INSERT INTO experiment_result_variables (exp_id, name, type) (
            SELECT _exp_id, name, type
                FROM experiment_result_variables
                WHERE exp_id=_base
        );

        INSERT INTO charts (exp_id, name, description) (
            SELECT _exp_id, name, description
                FROM charts
                WHERE exp_id=_base
        );

        INSERT INTO chart_config (chart_id, key, value, type) (
            SELECT c2.id, cfg.key, cfg.value, cfg.type
                FROM
                    charts c1
                    JOIN charts c2 ON (c1.name=c2.name)
                    JOIN chart_config cfg ON (c1.id=cfg.chart_id)
                WHERE c1.id != c2.id AND c1.exp_id=_base AND c2.exp_id=_exp_id
        );

        INSERT INTO chart_series (chart_id, name, type, x, y) (
            SELECT c2.id, ser.name, ser.type, c2r1.id, c2r2.id
                FROM
                    charts c1
                    JOIN charts c2 ON (c1.name=c2.name)
                    JOIN chart_series ser ON (c1.id=ser.chart_id)
                    JOIN experiment_result_variables c1r1 ON (ser.x=c1r1.id)
                    JOIN experiment_result_variables c1r2 ON (ser.y=c1r2.id)
                    JOIN experiment_result_variables c2r1 ON (c1r1.name=c2r1.name)
                    JOIN experiment_result_variables c2r2 ON (c1r2.name=c2r2.name)
                WHERE c1.id != c2.id AND c2r1.exp_id=c2.exp_id AND c2r2.exp_id=c2.exp_id AND
                    c1.exp_id=_base AND c2.exp_id=_exp_id
        );
    END IF;

    RETURN _exp_id;
END;
$$ LANGUAGE 'plpgsql';