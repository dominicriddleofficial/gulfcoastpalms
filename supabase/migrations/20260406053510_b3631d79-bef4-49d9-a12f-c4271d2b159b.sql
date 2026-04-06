-- Add hurricane_season_reminder as a valid sequence type for drip enrollments
-- and insert initial sequence configuration

-- Add opt-in tracking column to leads table for hurricane reminders
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS hurricane_reminder_optin boolean DEFAULT false;

-- Insert a comment-only marker — the email_drip_enrollments table already supports
-- sequence_type = 'hurricane_season_reminder' since it's a text field with no enum constraint.
-- The two emails in this sequence:
--   Step 1 (early May): "Hurricane season starts June 1st — is your palm ready?"
--   Step 2 (late May, if no booking): "Last chance to schedule pre-hurricane palm trimming"
