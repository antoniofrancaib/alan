-- Add ML research preferences to Users table
ALTER TABLE users ADD COLUMN ml_interests TEXT[];
ALTER TABLE users ADD COLUMN paper_length_preference VARCHAR(20) DEFAULT 'medium';
ALTER TABLE users ADD COLUMN technical_level VARCHAR(20) DEFAULT 'intermediate';
ALTER TABLE users ADD COLUMN last_paper_feedback JSONB;
ALTER TABLE users ADD COLUMN last_reminder_sent TIMESTAMP;
ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_ml_interests ON users USING GIN (ml_interests);
CREATE INDEX IF NOT EXISTS idx_users_technical_level ON users (technical_level);

-- Create type for tracking user reading progress
CREATE TYPE paper_status AS ENUM ('unread', 'reading', 'completed', 'saved');

-- Create table for tracking which papers users have read/saved
CREATE TABLE IF NOT EXISTS user_papers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    paper_date DATE NOT NULL,
    paper_index INTEGER NOT NULL, -- Index of the paper in the daily batch (0, 1, or 2)
    status paper_status DEFAULT 'unread',
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, paper_date, paper_index)
);

-- Add RLS policies for user_papers
ALTER TABLE user_papers ENABLE ROW LEVEL SECURITY;

-- Allow users to read and update their own paper preferences
CREATE POLICY "Users can manage their own paper preferences" ON user_papers
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow service role full access
CREATE POLICY "Allow service role full access to user_papers" ON user_papers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true); 