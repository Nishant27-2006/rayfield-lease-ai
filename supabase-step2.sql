-- STEP 2: Create user_files table
CREATE TABLE user_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  extracted_text TEXT,
  analysis_results JSONB,
  lease_type TEXT,
  analysis_modes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);