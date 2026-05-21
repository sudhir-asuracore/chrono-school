DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_org_name_unique') THEN
        ALTER TABLE subjects ADD CONSTRAINT subjects_org_name_unique UNIQUE (organization_id, name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_org_name_unique') THEN
        ALTER TABLE teachers ADD CONSTRAINT teachers_org_name_unique UNIQUE (organization_id, name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_org_name_unique') THEN
        ALTER TABLE classes ADD CONSTRAINT classes_org_name_unique UNIQUE (organization_id, name);
    END IF;
END;
$$;
