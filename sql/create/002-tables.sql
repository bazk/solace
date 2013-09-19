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
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id        INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
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
    owner           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (id),
    UNIQUE(name)
);

CREATE TABLE experiment_user_permissions (
    exp_id          INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read            BOOLEAN DEFAULT TRUE,
    write           BOOLEAN DEFAULT FALSE,
    UNIQUE (exp_id, user_id)
);

CREATE TABLE experiment_group_permissions (
    exp_id          INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    group_id        INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    read            BOOLEAN DEFAULT TRUE,
    write           BOOLEAN DEFAULT FALSE,
    UNIQUE (exp_id, group_id)
);

CREATE TABLE experiment_parameters (
    id              SERIAL,
    exp_id          INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    name            CITEXT NOT NULL,
    type            variable_type NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (exp_id, name)
);

CREATE TABLE experiment_result_variables (
    id              SERIAL,
    exp_id          INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    name            CITEXT NOT NULL,
    type            variable_type NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (exp_id, name)
);

CREATE TABLE experiment_files (
    id              CHAR(40) DEFAULT nextsha1(),
    exp_id          INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    type            TEXT DEFAULT 'application/octet-stream',
    size            BIGINT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    data            BYTEA,
    PRIMARY KEY (id)
);


--
-- instances --
--

CREATE TABLE instances (
    id              CHAR(40) DEFAULT nextsha1(),
    exp_id          INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    finished_at     TIMESTAMP WITH TIME ZONE,
    repository_ref  TEXT,
    comment         TEXT,
    PRIMARY KEY (id)
);

CREATE TABLE instance_parameter_values (
    instance_id     CHAR(40) NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    name            CITEXT NOT NULL,
    type            variable_type NOT NULL,
    value           TEXT NOT NULL,
    UNIQUE (instance_id, name)
);


--
-- runs --
--

CREATE TABLE runs (
    id              INTEGER NOT NULL,
    instance_id     CHAR(40) NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    started_at      TIMESTAMP WITH TIME ZONE,
    finished_at     TIMESTAMP WITH TIME ZONE,
    progress        REAL DEFAULT 0.0,
    canceled        BOOLEAN DEFAULT false,
    PRIMARY KEY (id, instance_id)
);

CREATE TABLE run_result_values (
    run_id          INTEGER NOT NULL,
    instance_id     CHAR(40) NOT NULL,
    moment          INTEGER NOT NULL,
    name            CITEXT NOT NULL,
    type            variable_type NOT NULL,
    value           TEXT NOT NULL,
    FOREIGN KEY (run_id, instance_id) REFERENCES runs (id, instance_id) ON DELETE CASCADE
);

CREATE TABLE run_files (
    run_id          INTEGER NOT NULL,
    instance_id     CHAR(40) NOT NULL,
    file_id         CHAR(40) NOT NULL REFERENCES experiment_files(id) ON DELETE CASCADE,
    FOREIGN KEY (run_id, instance_id) REFERENCES runs (id, instance_id) ON DELETE CASCADE
);


--
-- charts --
--

CREATE TABLE charts (
    id              SERIAL PRIMARY KEY,
    exp_id          INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE chart_config (
    chart_id        INTEGER NOT NULL REFERENCES charts(id),
    key             TEXT NOT NULL,
    value           TEXT NOT NULL
);

CREATE TABLE chart_series (
    chart_id        INTEGER NOT NULL REFERENCES charts(id),
    name            TEXT NOT NULL,
    type            TEXT,
    x               INTEGER NOT NULL REFERENCES experiment_result_variables(id),
    y               INTEGER NOT NULL REFERENCES experiment_result_variables(id)
);