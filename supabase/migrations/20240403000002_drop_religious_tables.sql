-- Drop saints table if it exists (not needed for ML papers)
DROP TABLE IF EXISTS saints;

-- Drop bible_verses table if it exists (not needed for ML papers)
DROP TABLE IF EXISTS bible_verses;

-- Drop gospels table if it exists (replaced by daily_papers)
DROP TABLE IF EXISTS gospels;

-- Add additional tracking for paper categories
CREATE TABLE IF NOT EXISTS paper_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert common ML paper categories
INSERT INTO paper_categories (name, description) VALUES
('Natural Language Processing', 'Research related to processing and understanding human language'),
('Computer Vision', 'Research related to visual understanding by computers'),
('Reinforcement Learning', 'Research related to training agents through reward signals'),
('Graph Neural Networks', 'Research on neural networks for graph-structured data'),
('Generative Models', 'Research on models that can generate new content'),
('Transformers', 'Research on transformer architectures and attention mechanisms'),
('Optimization', 'Research on optimization techniques for machine learning'),
('Federated Learning', 'Research on training models across multiple devices while preserving privacy'),
('Few-Shot Learning', 'Research on learning from limited examples'),
('Explainable AI', 'Research on making AI systems more interpretable')
ON CONFLICT (name) DO NOTHING; 