-- Create daily_papers table
CREATE TABLE IF NOT EXISTS daily_papers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    papers JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on date for faster lookups
CREATE INDEX IF NOT EXISTS daily_papers_date_idx ON daily_papers(date);

-- Add RLS policies
ALTER TABLE daily_papers ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON daily_papers
    FOR SELECT
    TO public
    USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON daily_papers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_daily_papers_updated_at
    BEFORE UPDATE ON daily_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 