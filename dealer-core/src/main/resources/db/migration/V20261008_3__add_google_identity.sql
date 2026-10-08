-- Self sign-up and Google sign-in (design/21-Feature-Extensions.md §5).
ALTER TABLE app_user
  ADD COLUMN email VARCHAR(254) NULL,
  ADD COLUMN google_subject VARCHAR(255) NULL,
  ADD CONSTRAINT uk_app_user_google_subject UNIQUE (google_subject);
