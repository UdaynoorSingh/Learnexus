-- Add nullable password for staff sign-in at /admin (students still use OTP only).
-- Run once against your database if you see: column u.password does not exist

ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
