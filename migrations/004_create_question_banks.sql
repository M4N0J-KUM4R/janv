CREATE TABLE question_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE question_type AS ENUM ('mcq', 'multi_select', 'true_false', 'coding');
CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE,
    question_type question_type NOT NULL,
    content TEXT NOT NULL,
    options JSONB,
    explanation TEXT,
    difficulty difficulty NOT NULL,
    tags TEXT[],
    points INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
