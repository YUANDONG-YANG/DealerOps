-- Admin-issued username/password auth (design/15-Data-Auth-and-Gateway.md S8, reversed from Entra 2026-09-30).
-- entra_oid holds the username and entra_tenant_id is fixed to 'local'; see S8.3 for the rationale.
ALTER TABLE app_user
  ADD COLUMN password_hash VARCHAR(100) NOT NULL DEFAULT '' AFTER entra_oid;
