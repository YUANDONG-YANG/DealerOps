-- Admin-issued username/password auth (design/15-Data-Auth-and-Gateway.md S8).
-- Passwords are stored only as BCrypt hashes; see S8.3.
ALTER TABLE app_user
  ADD COLUMN password_hash VARCHAR(100) NOT NULL DEFAULT '' AFTER username;
