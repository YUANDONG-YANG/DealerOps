-- One canonical form for the unique sign-in names (dealer/LoginIdentifiers.java): email trimmed and
-- lower-cased, phone stored as "+digits". Rows written before this used other phone spellings, which
-- let "+14035550142" and "14035550142" exist side by side.
UPDATE app_user SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;
UPDATE app_user
SET phone = CONCAT('+', REGEXP_REPLACE(phone, '[^0-9]', ''))
WHERE phone IS NOT NULL;
