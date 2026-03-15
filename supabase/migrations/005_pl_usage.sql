-- Usage tracking for free-tier limits (scans, chats, pets)
CREATE TABLE pl_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL,
  period text NOT NULL DEFAULT 'monthly',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_name)
);

-- RLS: users can only access their own usage records
ALTER TABLE pl_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage"
  ON pl_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON pl_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON pl_usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
