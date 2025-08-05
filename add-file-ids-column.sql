-- Add file_ids column to chat_sessions table
-- This column will store an array of file IDs for multi-document chat sessions

ALTER TABLE public.chat_sessions 
ADD COLUMN file_ids uuid[] DEFAULT NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN public.chat_sessions.file_ids IS 'Array of file IDs for multi-document chat sessions';

-- Optional: Add an index for better performance when querying by file_ids
CREATE INDEX idx_chat_sessions_file_ids ON public.chat_sessions USING GIN (file_ids);