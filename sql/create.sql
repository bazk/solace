CREATE TYPE param_type AS ENUM ('str', 'integer', 'real', 'boolean');

CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    username    TEXT NOT NULL,
    password    TEXT NOT NULL,
    email       TEXT NOT NULL
);

CREATE TABLE groups (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL
);

CREATE TABLE user_groups (
    user_id     INTEGER NOT NULL REFERENCES users(id),
    group_id    INTEGER NOT NULL REFERENCES groups(id)
);

CREATE TABLE experiments (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE experiment_user_permissions (
    exp_id      INTEGER NOT NULL REFERENCES experiments(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),
    read        BOOLEAN DEFAULT TRUE,
    write       BOOLEAN DEFAULT FALSE
);

CREATE TABLE experiment_group_permissions (
    exp_id      INTEGER NOT NULL REFERENCES experiments(id),
    group_id    INTEGER NOT NULL REFERENCES groups(id),
    read        BOOLEAN DEFAULT TRUE,
    write       BOOLEAN DEFAULT FALSE
);

CREATE TABLE instances (
    id          SERIAL PRIMARY KEY,
    exp_id      INTEGER NOT NULL REFERENCES experiments(id),
    started_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    num_runs    INTEGER NOT NULL,
    comment     TEXT
);

CREATE TABLE parameters (
    instance_id INTEGER NOT NULL REFERENCES instances(id),
    name        TEXT NOT NULL,
    value       TEXT NOT NULL,
    type        param_type NOT NULL
);

CREATE TABLE runs (
    id          SERIAL PRIMARY KEY,
    instance_id INTEGER NOT NULL REFERENCES instances(id),
    started_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    progress    REAL DEFAULT 0.0
);

CREATE TABLE results (
    run_id      INTEGER NOT NULL REFERENCES runs(id),
    inserted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    name        TEXT NOT NULL,
    value       TEXT NOT NULL,
    type        param_type NOT NULL
);