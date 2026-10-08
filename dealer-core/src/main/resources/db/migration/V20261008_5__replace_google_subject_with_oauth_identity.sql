-- Store provider-qualified identities separately so a user can explicitly link more than one provider.
CREATE TABLE user_identity (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  provider VARCHAR(16) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  email VARCHAR(254) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_identity (provider, subject),
  CONSTRAINT fk_user_identity_user FOREIGN KEY (user_id) REFERENCES app_user(id)
);

INSERT INTO user_identity (user_id, provider, subject, email)
SELECT id, 'google', google_subject, email
FROM app_user
WHERE google_subject IS NOT NULL;

ALTER TABLE app_user
  DROP INDEX uk_app_user_google_subject,
  DROP COLUMN google_subject;
