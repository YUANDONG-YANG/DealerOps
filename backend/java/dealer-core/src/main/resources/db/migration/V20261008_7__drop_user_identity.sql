-- Third-party sign-in was removed (design/21-Feature-Extensions.md §5): each provider needs official
-- app registration, which the student demo does not have. app_user.email stays for self sign-up.
DROP TABLE user_identity;
