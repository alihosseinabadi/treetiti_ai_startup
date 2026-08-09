#!/bin/bash
# TREEtiti AI Marketing OS — local database bootstrap (run once).
# Creates the PostgreSQL role + database, then applies schema.sql.

set -euo pipefail

DB_USER="${DB_USER:-treetiti}"
DB_PASS="${DB_PASS:-treetiti}"
DB_NAME="${DB_NAME:-treetiti_ai_os}"

echo "==> Creating role '$DB_USER' and database '$DB_NAME'"

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SQL

if ! psql -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
  psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname postgres \
    -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi

echo "==> Applying schema (pgvector extension)"
psql -v ON_ERROR_STOP=1 --username "${DB_USER}" --dbname "${DB_NAME}" \
  -f "$(dirname "$0")/schema.sql"

echo "==> Done. Database '$DB_NAME' ready."
