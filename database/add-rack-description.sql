-- Add description field to rack_metadata table
-- Migration: Add rack description functionality

ALTER TABLE public.rack_metadata 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add constraint to limit description length (40 characters as requested)
ALTER TABLE public.rack_metadata 
ADD CONSTRAINT rack_description_length CHECK (LENGTH(description) <= 40);

-- Add comment for documentation
COMMENT ON COLUMN public.rack_metadata.description IS 'User-defined rack description (max 40 characters)';
