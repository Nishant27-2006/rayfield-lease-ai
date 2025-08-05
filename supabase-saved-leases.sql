-- Add saved_leases table for storing user's saved lease analyses

CREATE TABLE IF NOT EXISTS saved_leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES user_files(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  lease_type TEXT,
  analysis_modes TEXT[],
  analysis_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, file_id)
);

-- Enable Row Level Security
ALTER TABLE saved_leases ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for saved_leases
CREATE POLICY "Users can view own saved leases" ON saved_leases 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved leases" ON saved_leases 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved leases" ON saved_leases 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved leases" ON saved_leases 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_leases_user_id ON saved_leases(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_leases_file_id ON saved_leases(file_id);
CREATE INDEX IF NOT EXISTS idx_saved_leases_lease_type ON saved_leases(lease_type);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_saved_leases_updated_at BEFORE UPDATE ON saved_leases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();