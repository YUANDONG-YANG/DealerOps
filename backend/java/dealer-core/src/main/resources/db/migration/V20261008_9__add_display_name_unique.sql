-- Full names are unique sign-up data (design/21-Feature-Extensions.md §5). The column collation is
-- case-insensitive, and the application stores names trimmed, so "Robin" and " robin " collide.
ALTER TABLE app_user
  ADD CONSTRAINT uk_app_user_display_name UNIQUE (display_name);
