-- Database initialization script
-- Runs once when the PostgreSQL container is first created.
-- Alembic migrations handle all schema changes after this point.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fast ILIKE searches on text columns
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable pgcrypto for additional hashing utilities (optional but useful)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';
