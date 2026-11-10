-- Only owner-entered profiles may have unknown metrics or contact details.
-- Existing public submissions keep their data and the public form stays complete.
ALTER TABLE creators
  ADD COLUMN entry_method VARCHAR(10) NOT NULL DEFAULT 'form' CHECK (entry_method IN ('form', 'manual')),
  ADD COLUMN added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ALTER COLUMN follower_count DROP NOT NULL,
  ALTER COLUMN average_reel_views DROP NOT NULL,
  ALTER COLUMN rate_per_reel DROP NOT NULL,
  ALTER COLUMN whatsapp DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE creators ADD CONSTRAINT creators_public_details_required CHECK (
  entry_method = 'manual' OR (
    follower_count IS NOT NULL AND average_reel_views IS NOT NULL
    AND rate_per_reel IS NOT NULL AND whatsapp IS NOT NULL AND email IS NOT NULL
  )
);
