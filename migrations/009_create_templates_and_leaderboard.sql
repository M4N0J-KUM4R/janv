-- Assessment Templates: reusable test blueprints
CREATE TABLE assessment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    duration_mins INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    pass_percentage DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    shuffle_questions BOOLEAN NOT NULL DEFAULT false,
    show_results BOOLEAN NOT NULL DEFAULT false,
    question_config JSONB,  -- stored question structure/types
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessment Passcodes: access-controlled tests
CREATE TABLE assessment_passcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    passcode VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(assessment_id)
);

CREATE INDEX idx_assessment_passcodes_code ON assessment_passcodes(passcode);

-- Leaderboard: materialized ranking per assessment
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    total_marks INTEGER NOT NULL,
    percentage DOUBLE PRECISION NOT NULL,
    time_taken_secs INTEGER,
    completed_at TIMESTAMPTZ,
    UNIQUE(assessment_id, student_id)
);

CREATE INDEX idx_leaderboard_assessment ON leaderboard_entries(assessment_id, rank);

-- FAQs table
CREATE TABLE faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
