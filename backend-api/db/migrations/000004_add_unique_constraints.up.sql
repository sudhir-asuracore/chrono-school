ALTER TABLE subjects ADD CONSTRAINT subjects_org_name_unique UNIQUE (organization_id, name);
ALTER TABLE teachers ADD CONSTRAINT teachers_org_name_unique UNIQUE (organization_id, name);
ALTER TABLE classes ADD CONSTRAINT classes_org_name_unique UNIQUE (organization_id, name);
