CREATE TYPE variable_type AS ENUM ('string', 'integer', 'real', 'boolean');
CREATE TYPE source_type AS ENUM ('parameter', 'result');

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        TEXT NOT NULL,
    password        TEXT NOT NULL,
    email           TEXT NOT NULL
);

CREATE UNIQUE INDEX users_unique_name_idx ON users (lower(username));

CREATE TABLE groups (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL
);

CREATE TABLE user_groups (
    user_id         INTEGER NOT NULL REFERENCES users(id),
    group_id        INTEGER NOT NULL REFERENCES groups(id)
);

CREATE TABLE experiments (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    repository_url  TEXT
);

CREATE TABLE experiment_user_permissions (
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    user_id         INTEGER NOT NULL REFERENCES users(id),
    read            BOOLEAN DEFAULT TRUE,
    write           BOOLEAN DEFAULT FALSE
);

CREATE TABLE experiment_group_permissions (
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    group_id        INTEGER NOT NULL REFERENCES groups(id),
    read            BOOLEAN DEFAULT TRUE,
    write           BOOLEAN DEFAULT FALSE
);

CREATE TABLE experiment_parameters (
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    name            TEXT NOT NULL,
    type            variable_type NOT NULL
);

CREATE TABLE experiment_result_variables (
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    name            TEXT NOT NULL,
    type            variable_type NOT NULL
);

CREATE TABLE instances (
    id              SERIAL PRIMARY KEY,
    exp_id          INTEGER NOT NULL REFERENCES experiments(id),
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    finished_at     TIMESTAMP WITH TIME ZONE,
    repository_ref  TEXT,
    comment         TEXT
);

CREATE TABLE instance_parameter_values (
    instance_id     INTEGER NOT NULL REFERENCES instances(id),
    name            TEXT NOT NULL,
    value           TEXT NOT NULL
);

CREATE TABLE runs (
    id              SERIAL PRIMARY KEY,
    instance_id     INTEGER NOT NULL REFERENCES instances(id),
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    finished_at     TIMESTAMP WITH TIME ZONE,
    progress        REAL DEFAULT 0.0,
);

CREATE TABLE run_result_values (
    run_id          INTEGER NOT NULL REFERENCES runs(id),
    inserted_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    name            TEXT NOT NULL,
    value           TEXT NOT NULL
);

CREATE TABLE charts (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    created_by      INTEGER NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
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
    x               TEXT NOT NULL,
    x_source        source_type NOT NULL,
    y               TEXT NOT NULL,
    y_source        source_type NOT NULL,
);


CREATE TABLE files (
    id              SERIAL PRIMARY KEY,
    run_id          INTEGER NOT NULL REFERENCES runs(id),
    inserted_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    data            BYTEA
);