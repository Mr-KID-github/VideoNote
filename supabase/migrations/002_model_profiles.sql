CREATE TABLE IF NOT EXISTS model_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (
    provider IN (
      'openai-compatible',
      'anthropic-compatible',
      'azure-openai',
      'ollama',
      'groq-openai-compatible'
    )
  ),
  base_url TEXT NOT NULL,
  model_name TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_model_profiles_user_name
  ON model_profiles(user_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_model_profiles_single_default
  ON model_profiles(user_id)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_model_profiles_user_active
  ON model_profiles(user_id, is_active);

ALTER TABLE model_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own model profiles" ON model_profiles;
CREATE POLICY "Users can manage their own model profiles" ON model_profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
