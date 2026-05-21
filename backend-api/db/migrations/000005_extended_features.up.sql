-- Migration to add extended features: Rooms, Teacher Availability, and Session Binding

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS required_room_type TEXT;

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS availability_matrix JSONB;

ALTER TABLE curriculum_items ADD COLUMN IF NOT EXISTS binding_id TEXT;
