SET client_encoding = 'UTF8';
SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION has_permission(_user_id integer,
                                          _exp_name text,
                                          _type text default 'read') RETURNS boolean AS
$$
    SELECT has_permission($1, (SELECT id FROM experiments WHERE name = $2), $3);
$$
LANGUAGE SQL;