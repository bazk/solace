SET client_encoding = 'UTF8';
SET client_min_messages = warning;

CREATE TABLE session (
    id              TEXT,
    data            TEXT,
    expire          TIMESTAMP WITH TIME ZONE DEFAULT now() + interval '1 week',
    PRIMARY KEY (id)
);

CREATE OR REPLACE FUNCTION session_set(_sessid TEXT,
                                       _data TEXT,
                                       _expire TIMESTAMP WITH TIME ZONE) RETURNS VOID AS
$$
BEGIN
    UPDATE session SET data = _data, expire = _expire WHERE id = _sessid;

    IF NOT FOUND THEN
        INSERT INTO session (id, data, expire) VALUES (_sessid, _data, _expire);
    END IF;
END;
$$ LANGUAGE 'plpgsql';


CREATE OR REPLACE FUNCTION session_get(_sessid TEXT) RETURNS TEXT AS
$$
DECLARE
    _data TEXT;
BEGIN
    SELECT data INTO _data FROM session WHERE id = _sessid AND (expire > now() OR expire is null);
    RETURN _data;
END;
$$ LANGUAGE 'plpgsql';


CREATE OR REPLACE FUNCTION session_destroy(_sessid TEXT) RETURNS VOID AS
$$
BEGIN
    DELETE FROM session WHERE id = _sessid;
END;
$$ LANGUAGE 'plpgsql';


CREATE OR REPLACE FUNCTION session_count() RETURNS INTEGER AS
$$
DECLARE
    _count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO _count FROM session WHERE expire > now() OR expire is null;
    RETURN _count;
END;
$$ LANGUAGE 'plpgsql';


CREATE OR REPLACE FUNCTION session_clear() RETURNS VOID AS
$$
BEGIN
    DELETE FROM session;
END;
$$ LANGUAGE 'plpgsql';


CREATE OR REPLACE FUNCTION session_clear_expired() RETURNS TRIGGER AS
$$
BEGIN
    DELETE FROM session WHERE expire < now();
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER session_clear_expired
    AFTER INSERT OR UPDATE
    ON session
    EXECUTE procedure session_clear_expired();