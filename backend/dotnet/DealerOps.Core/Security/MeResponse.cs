namespace DealerOps.Core.Security;

public record MeResponse(
    string Username,
    string? DisplayName,
    string? Role,
    long? DealerId,
    string? DealerLegalName,
    string? DealerContactPhone,
    string? DealerContactEmail,
    string? DealerContactAddress,
    string? DealerLogoDataUrl,
    // Caller's own contact + how they got into the system. SignInMethod is "google" when the
    // account was provisioned without a password hash and "password" otherwise; the frontend
    // uses it on the profile page to tell the user which sign-in to keep working.
    string? Email,
    string? Phone,
    string SignInMethod,
    // Extra identity claims lifted from the Google ID token (openid email profile scope). All
    // null for a password-only account; the UI uses them for avatar / name split / locale.
    string? GivenName,
    string? FamilyName,
    string? AvatarUrl,
    string? Locale);
