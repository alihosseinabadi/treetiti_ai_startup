-- TREEtiti AI Marketing OS — PostgreSQL schema bootstrap.
-- Tables are created by SQLAlchemy (Base.metadata.create_all) at app startup;
-- this file only creates the database, the role and the pgvector extension.

CREATE EXTENSION IF NOT EXISTS vector;
