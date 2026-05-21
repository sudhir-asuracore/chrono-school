-- Migration to add educational levels and update classes and teachers

CREATE TABLE IF NOT EXISTS educational_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add level_id to classes
ALTER TABLE classes ADD COLUMN level_id UUID REFERENCES educational_levels(id);

-- Create teacher_qualifications to replace teacher_subjects
-- This allows a teacher to be qualified for a subject at a specific level
CREATE TABLE IF NOT EXISTS teacher_qualifications (
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES educational_levels(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id, level_id)
);

-- For migration purposes, if there were any teacher_subjects, they might be lost if we don't have levels yet.
-- Since this is a structural change requested, we will proceed with the new table.
