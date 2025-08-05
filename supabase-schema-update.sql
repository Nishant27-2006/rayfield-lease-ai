-- Add new columns to user_files table for lease analysis
ALTER TABLE user_files 
ADD COLUMN analysis_results JSONB,
ADD COLUMN lease_type TEXT,
ADD COLUMN analysis_modes TEXT[];

-- Update existing records to have default values
UPDATE user_files 
SET 
  lease_type = 'generic',
  analysis_modes = ARRAY['standard']
WHERE lease_type IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_files_lease_type ON user_files(lease_type);
CREATE INDEX IF NOT EXISTS idx_user_files_analysis_modes ON user_files USING GIN(analysis_modes);