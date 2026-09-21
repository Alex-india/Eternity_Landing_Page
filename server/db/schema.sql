-- ===========================================
-- ETERNITY — PostgreSQL Database Schema
-- ===========================================
-- Run via: node db/migrate.js
-- Or manually: psql $DATABASE_URL -f db/schema.sql

-- ───────────────────────────────────────────
-- USERS TABLE
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────
-- INQUIRIES TABLE
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  service       VARCHAR(100),
  budget        VARCHAR(100),
  message       TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'new',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────
-- BOOKINGS TABLE (Cal.com sync)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id            SERIAL PRIMARY KEY,
  booking_uid   VARCHAR(100) UNIQUE,
  event_type    VARCHAR(100),
  title         VARCHAR(255),
  start_time    TIMESTAMPTZ,
  end_time      TIMESTAMPTZ,
  attendee_name VARCHAR(200),
  attendee_email VARCHAR(255),
  status        VARCHAR(50) DEFAULT 'ACCEPTED',
  meeting_url   TEXT,
  raw_payload   JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────
-- INDEXES
-- ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(attendee_email);
CREATE INDEX IF NOT EXISTS idx_bookings_uid ON bookings(booking_uid);

