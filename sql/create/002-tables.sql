SET client_encoding = 'UTF8';
SET client_min_messages = warning;

--
-- user and groups --
--

CREATE TABLE users (
    id              SERIAL,
    username        CITEXT NOT NULL,
    password        TEXT NOT NULL,
    email           TEXT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (username)
);

CREATE TABLE groups (
    id              SERIAL,
    name            CITEXT NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE user_groups (
    user_id         INTEGER NOT NULL REFERENCES users(id),
    group_id        INTEGER NOT NULL REFERENCES groups(id),
    UNIQUE (user_id, group_id)
);


--
-- experiments --
--

CREATE TABLE experiments (
    id              SERIAL,
    name            CITEXT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    repository_url  TEXT,
    owner           INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (id),
    UNIQUE(name)
);

CREATE TABLE experiment_user_permissions (
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    user_id         INTEGER NOT NULL REFERENCES users(id),
    read            BOOLEAN DEFAULT TRUE,
    write           BOOLEAN DEFAULT FALSE,
    UNIQUE (exp_id, user_id)
);

CREATE TABLE experiment_group_permissions (
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    group_id        INTEGER NOT NULL REFERENCES groups(id),
    read            BOOLEAN DEFAULT TRUE,
    write           BOOLEAN DEFAULT FALSE,
    UNIQUE (exp_id, group_id)
);

CREATE TABLE experiment_parameters (
    id              SERIAL,
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    name            CITEXT NOT NULL,
    type            variable_type NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (exp_id, name)
);

CREATE TABLE experiment_result_variables (
    id              SERIAL,
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    name            CITEXT NOT NULL,
    type            variable_type NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (exp_id, name)
);


--
-- instances --
--

CREATE TABLE instances (
    id              CHAR(40) DEFAULT nextsha1(),
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    finished_at     TIMESTAMP WITH TIME ZONE,
    repository_ref  TEXT,
    comment         TEXT,
    PRIMARY KEY (id)
);

CREATE TABLE instance_parameter_values (
    instance_id     CHAR(40) NOT NULL REFERENCES instances(id),
    name            CITEXT NOT NULL,
    type            variable_type NOT NULL,
    value           TEXT NOT NULL,
    UNIQUE (instance_id, name)
);


--
-- runs --
--

CREATE TABLE runs (
    id              SERIAL,
    instance_id     CHAR(40) NOT NULL REFERENCES instances(id),
    num             INTEGER NOT NULL,
    started_at      TIMESTAMP WITH TIME ZONE,
    finished_at     TIMESTAMP WITH TIME ZONE,
    progress        REAL DEFAULT 0.0,
    canceled        BOOLEAN DEFAULT false,
    PRIMARY KEY (id),
    UNIQUE (instance_id, num)
);

CREATE TABLE run_result_values (
    run_id          INTEGER NOT NULL REFERENCES runs(id),
    name            CITEXT NOT NULL,
    type            variable_type NOT NULL,
    inserted_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    value           TEXT NOT NULL
);


--
-- files and directories --
--

CREATE SEQUENCE directories_seq START 1;

CREATE TABLE directories (
    id              INTEGER DEFAULT nextval('directories_seq'),
    parent_id       INTEGER REFERENCES directories(id),
    name            TEXT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (parent_id, name)
);

INSERT INTO directories (id,name) VALUES (0,'');

CREATE TABLE files (
    id              SERIAL,
    parent_id       INTEGER REFERENCES directories(id),
    name            TEXT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    owner           INTEGER NOT NULL REFERENCES users(id),
    data            BYTEA,
    PRIMARY KEY (id),
    UNIQUE (parent_id, name)
);

--
-- charts --
--

-- CREATE TABLE charts (
--     id              SERIAL PRIMARY KEY,
--     name            TEXT NOT NULL,
--     description     TEXT,
--     created_by      INTEGER NOT NULL REFERENCES users(id),
--     created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
-- );

-- CREATE TABLE chart_config (
--     chart_id        INTEGER NOT NULL REFERENCES charts(id),
--     key             TEXT NOT NULL,
--     value           TEXT NOT NULL
-- );

-- CREATE TABLE chart_series (
--     chart_id        INTEGER NOT NULL REFERENCES charts(id),
--     name            TEXT NOT NULL,
--     type            TEXT,
--     x               TEXT NOT NULL,
--     x_source        source_type NOT NULL,
--     y               TEXT NOT NULL,
--     y_source        source_type NOT NULL,
-- );