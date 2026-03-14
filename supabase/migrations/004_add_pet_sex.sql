ALTER TABLE pl_pets ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('male', 'female'));
