-- Create a table for paper categorization
CREATE TABLE IF NOT EXISTS paper_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paper_date DATE NOT NULL,
    paper_index INTEGER NOT NULL, -- Index of the paper in the daily batch (0, 1, or 2)
    category_id INTEGER REFERENCES paper_categories(id),
    confidence FLOAT NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(paper_date, paper_index, category_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_paper_mappings ON paper_mappings(paper_date, paper_index);

-- Create a function to recommend papers based on user interests
CREATE OR REPLACE FUNCTION recommend_papers_for_user(user_id_param INTEGER)
RETURNS TABLE (
    paper_date DATE,
    paper_index INTEGER,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_interests AS (
        SELECT unnest(ml_interests) AS interest
        FROM users
        WHERE id = user_id_param
    ),
    interest_categories AS (
        SELECT c.id
        FROM paper_categories c
        JOIN user_interests ui ON c.name ILIKE '%' || ui.interest || '%'
    ),
    user_paper_history AS (
        SELECT paper_date, paper_index
        FROM user_papers
        WHERE user_id = user_id_param AND status IN ('completed', 'saved')
    ),
    paper_scores AS (
        SELECT 
            pm.paper_date,
            pm.paper_index,
            SUM(pm.confidence) AS relevance_score
        FROM paper_mappings pm
        JOIN interest_categories ic ON pm.category_id = ic.id
        LEFT JOIN user_paper_history uph ON pm.paper_date = uph.paper_date AND pm.paper_index = uph.paper_index
        WHERE uph.paper_date IS NULL -- Exclude papers the user has already read
        GROUP BY pm.paper_date, pm.paper_index
    )
    SELECT
        ps.paper_date,
        ps.paper_index,
        ps.relevance_score
    FROM paper_scores ps
    ORDER BY 
        ps.paper_date DESC, -- Prefer newer papers
        ps.relevance_score DESC -- Then prefer more relevant ones
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE paper_mappings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to paper mappings" ON paper_mappings
    FOR SELECT
    TO public
    USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to paper mappings" ON paper_mappings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true); 