SET client_encoding = 'UTF8';
SET client_min_messages = warning;

CREATE TYPE variable_type AS ENUM ('string', 'integer', 'real', 'boolean', 'list');
CREATE TYPE source_type AS ENUM ('parameter', 'result');

CREATE SEQUENCE hash_seq;
CREATE SEQUENCE sha1_seq;