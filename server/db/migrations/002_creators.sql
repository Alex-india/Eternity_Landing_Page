CREATE TABLE creators (
  id UUID PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  instagram_handle VARCHAR(30) NOT NULL UNIQUE CHECK (instagram_handle = LOWER(instagram_handle)),
  niche VARCHAR(40) NOT NULL,
  follower_count BIGINT NOT NULL CHECK (follower_count BETWEEN 0 AND 2000000000),
  average_reel_views BIGINT NOT NULL CHECK (average_reel_views BETWEEN 0 AND 2000000000),
  country VARCHAR(80) NOT NULL,
  rate_per_reel NUMERIC(12,2) NOT NULL CHECK (rate_per_reel >= 0),
  rate_currency CHAR(3) NOT NULL DEFAULT 'INR',
  whatsapp VARCHAR(16) NOT NULL,
  email VARCHAR(254) NOT NULL,
  source VARCHAR(100),
  consent_at TIMESTAMPTZ NOT NULL,
  consent_version VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'active')),
  quality_score SMALLINT CHECK (quality_score BETWEEN 0 AND 100),
  internal_notes TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ,
  confirmation_email_status VARCHAR(20) NOT NULL DEFAULT 'disabled' CHECK (confirmation_email_status IN ('disabled', 'pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX creators_status_created ON creators(status, created_at DESC);
CREATE INDEX creators_niche ON creators(niche);
CREATE INDEX creators_source ON creators(source);
