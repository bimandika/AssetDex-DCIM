-- Migration: Add is_approved column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;
-- Optionally, set all existing users to approved (except new signups)
UPDATE profiles SET is_approved = true WHERE is_approved IS NULL;
