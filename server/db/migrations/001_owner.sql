ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'owner'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS users_single_owner ON users(role) WHERE role = 'owner';
DELETE FROM users WHERE LOWER(email) = 'demo@eternity.dev';
