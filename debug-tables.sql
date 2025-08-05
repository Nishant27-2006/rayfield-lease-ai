-- Debug: Check what tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if user_files exists in any schema
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'user_files';

-- List all tables in the database
\dt