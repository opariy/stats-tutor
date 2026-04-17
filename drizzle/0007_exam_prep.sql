-- Add new enum values for course materials type
-- Note: PostgreSQL doesn't allow modifying enums directly in all cases
-- We use a safe approach that works with existing data

-- Add 'image' type if it doesn't exist
DO $$
BEGIN
    ALTER TYPE course_materials_type ADD VALUE IF NOT EXISTS 'image';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add 'docx' type if it doesn't exist
DO $$
BEGIN
    ALTER TYPE course_materials_type ADD VALUE IF NOT EXISTS 'docx';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
