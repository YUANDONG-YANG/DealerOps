ALTER TABLE app_user
  ADD COLUMN phone VARCHAR(40) NULL,
  ADD CONSTRAINT uk_app_user_email UNIQUE (email),
  ADD CONSTRAINT uk_app_user_phone UNIQUE (phone);
