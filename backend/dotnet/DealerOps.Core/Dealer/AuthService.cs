using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;
using DealerOps.Core.Notifications;
using DealerOps.Core.Security;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Dealer;

public class AuthService
{
    // A Google account carries no username, so one is derived from the email address. Each cap
    // leaves room for the longest collision suffix without exceeding the column: username
    // 56 + ".123456" = 63 of 64, display name 110 + " (123456)" = 119 of 120.
    private const int UsernameBaseMaxLength = 56;
    private const int DisplayNameBaseMaxLength = 110;
    private const int MaxSuffixAttempts = 50;

    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly IAuditService _audit;
    private readonly NewAccountRules _accountRules;
    private readonly GoogleIdTokenVerifier _google;
    private readonly FirebaseIdTokenVerifier _firebase;
    private readonly NotificationService _notifications;
    private readonly string _unknownUserHash;

    public AuthService(AppDbContext db, JwtService jwt, IAuditService audit, NewAccountRules accountRules,
        GoogleIdTokenVerifier google, FirebaseIdTokenVerifier firebase, NotificationService notifications)
    {
        _db = db;
        _jwt = jwt;
        _audit = audit;
        _accountRules = accountRules;
        _google = google;
        _firebase = firebase;
        _notifications = notifications;
        _unknownUserHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString());
    }

    /// <summary>
    /// Verifies a Firebase email/password token and exchanges it for the application's JWT.
    /// Firebase owns the password; DealerOps still owns the local account, role, dealership
    /// membership and authorization decisions.
    /// </summary>
    public async Task<LoginResponse> FirebaseSignIn(
        FirebaseSignInRequest request, CancellationToken cancellationToken)
    {
        var identity = await _firebase.VerifyAsync(request.IdToken.Trim(), cancellationToken);
        var email = LoginIdentifiers.Email(identity.Email);
        var user = _db.AppUsers.FirstOrDefault(u => u.FirebaseUid == identity.Uid && u.Active)
                   ?? _db.AppUsers.FirstOrDefault(u => u.Email != null && u.Email.ToLower() == email && u.Active);

        if (user?.Role == AppRole.PlatformAdmin)
            throw new ApiException(ErrorCode.Forbidden, "Firebase sign-in is not available for platform administrators.");

        if (user == null)
        {
            var username = string.IsNullOrWhiteSpace(request.Username)
                ? AvailableUsername(email)
                : request.Username.Trim();
            var displayName = string.IsNullOrWhiteSpace(request.DisplayName)
                ? (identity.DisplayName?.Trim() ?? username)
                : request.DisplayName.Trim();
            if (displayName.Length == 0) displayName = username;
            var contact = _accountRules.CanonicalContact(email, request.Phone);
            _accountRules.RequireAvailable(username, displayName, contact);

            user = new AppUserEntity
            {
                Username = username,
                // Password verification belongs to Firebase for this account.
                PasswordHash = "",
                DisplayName = displayName,
                Email = contact.Email,
                Phone = contact.Phone ?? identity.PhoneNumber,
                Role = AppRole.DealerUser,
                DealerId = null,
                Active = true,
                FirebaseUid = identity.Uid
            };

            using var tx = _db.Database.BeginTransaction();
            try
            {
                _db.AppUsers.Add(user);
                _db.SaveChanges();
            }
            catch (DbUpdateException ex)
            {
                throw _accountRules.Conflict(ex);
            }

            _audit.Record("APP_USER", user.Id, "CREATE", null, user.Username,
                new Dictionary<string, object> { ["registration"] = "firebase" });
            _db.SaveChanges();
            tx.Commit();
        }
        else if (user.FirebaseUid != identity.Uid)
        {
            // Link an existing email account on its first Firebase sign-in only when Firebase
            // has verified the address; otherwise anyone could register that email in Firebase
            // and take over the account.
            if (!identity.EmailVerified)
                throw new ApiException(ErrorCode.EmailTaken,
                    "This email already belongs to an account. Sign in with that account's password.",
                    new Dictionary<string, string> { ["email"] = "This email is already registered." });
            user.FirebaseUid = identity.Uid;
            _db.SaveChanges();
        }

        return new LoginResponse(_jwt.Issue(user), user.Role.Value, user.DisplayName);
    }

    public LoginResponse Login(LoginRequest request)
    {
        var identifier = request.Identifier.Trim();
        var user = FindForSignIn(identifier);
        var hasPassword = user != null && !string.IsNullOrEmpty(user.PasswordHash);
        var passwordHash = hasPassword ? user!.PasswordHash : _unknownUserHash;

        if (!BCrypt.Net.BCrypt.Verify(request.Password, passwordHash) || !hasPassword)
            throw new ApiException(ErrorCode.Unauthorized, "Invalid sign-in name or password");

        return new LoginResponse(_jwt.Issue(user!), user!.Role.Value, user.DisplayName);
    }

    public LoginResponse Register(RegisterRequest request)
    {
        var contact = _accountRules.CanonicalContact(request.Email, request.Phone);
        var username = request.Username.Trim();
        var displayName = request.DisplayName.Trim();
        _accountRules.RequireAvailable(username, displayName, contact);

        var user = new AppUserEntity
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            DisplayName = displayName,
            Email = contact.Email,
            Phone = contact.Phone,
            Role = AppRole.DealerUser,
            DealerId = null,
            Active = true
        };

        using var tx = _db.Database.BeginTransaction();
        try
        {
            _db.AppUsers.Add(user);
            _db.SaveChanges();
        }
        catch (DbUpdateException ex)
        {
            throw _accountRules.Conflict(ex);
        }

        _audit.Record("APP_USER", user.Id, "CREATE", null, user.Username,
            new Dictionary<string, object> { ["registration"] = "password" });
        _db.SaveChanges();
        tx.Commit();

        return new LoginResponse(_jwt.Issue(user), user.Role.Value, user.DisplayName);
    }

    /// <summary>
    /// Signs in with a Google ID token. Google proves the email address only: an account it has
    /// never seen is created unbound, exactly like password self-registration, so a platform
    /// admin still has to bind it to a dealership before any business data is reachable
    /// (AUTH-13, AUTH-14). Tenancy is unchanged — it is resolved per request from the
    /// membership table, never from the identity provider.
    /// </summary>
    public async Task<GoogleSignInResponse> GoogleSignIn(GoogleSignInRequest request, CancellationToken cancellationToken)
    {
        var identity = await _google.VerifyAsync(request.IdToken.Trim(), cancellationToken);
        var email = LoginIdentifiers.Email(identity.Email);
        // An optional dealerId must name an active dealership (contract §1.6: 404 otherwise).
        var requestedDealerId = request.DealerId;
        if (requestedDealerId is long id && !_db.Dealers.Any(d => d.Id == id && d.Active))
            throw new ApiException(ErrorCode.NotFound, "Dealership not found.");

        // Prefer Google's stable subject id so an email change (G Suite rename, address move)
        // keeps the same DealerOps account; fall back to email for accounts created before we
        // stored sub.
        var user = _db.AppUsers.FirstOrDefault(u => u.GoogleSub == identity.Subject && u.Active)
                   ?? _db.AppUsers.FirstOrDefault(u => u.Email != null && u.Email.ToLower() == email && u.Active);

        // The platform admin is seeded from the environment and keeps password-only sign-in, so
        // control of its mailbox is not enough to reach the admin console (AUTH-15).
        if (user?.Role == AppRole.PlatformAdmin)
            throw new ApiException(ErrorCode.Forbidden, "Sign in with your password as the platform administrator.");

        // Keep stored Google claims in sync with the latest token on every sign-in, so a user
        // who updated their photo or name in Google sees it reflected here next request.
        if (user != null)
            SyncGoogleIdentity(user, identity);

        // A signed-in unbound account lands on the no-access screen and files its own join
        // request (AUTH-25). Google therefore always returns a session, including when the
        // account has no dealership yet. An optional dealerId still records that request.
        if (user == null)
            user = CreateUnboundGoogleUser(email, identity, requestedDealerId);
        else if (user.DealerId == null && user.RequestedDealerId == null && requestedDealerId.HasValue)
            SetRequestedDealer(user, requestedDealerId.Value);
        // An account that already has a pending request keeps it; signing in never fails on it.

        return new GoogleSignInResponse("ok",
            new LoginResponse(_jwt.Issue(user), user.Role!.Value, user.DisplayName));
    }

    private AppUserEntity CreateUnboundGoogleUser(string email, GoogleIdentity identity, long? requestedDealerId)
    {
        var username = AvailableUsername(email);
        var user = new AppUserEntity
        {
            Username = username,
            // No password hash: Login treats an empty hash as "cannot sign in with a password",
            // so this account can only ever come back through Google.
            PasswordHash = "",
            DisplayName = AvailableDisplayName(identity.Name, username),
            Email = email,
            Phone = null,
            Role = AppRole.DealerUser,
            DealerId = null,
            RequestedDealerId = requestedDealerId,
            Active = true,
            GoogleSub = identity.Subject,
            GivenName = Truncate(identity.GivenName, 120),
            FamilyName = Truncate(identity.FamilyName, 120),
            AvatarUrl = identity.Picture,
            Locale = Truncate(identity.Locale, 16)
        };

        using var tx = _db.Database.BeginTransaction();
        try
        {
            _db.AppUsers.Add(user);
            _db.SaveChanges();
        }
        catch (DbUpdateException ex)
        {
            throw _accountRules.Conflict(ex);
        }

        var summary = new Dictionary<string, object> { ["registration"] = "google" };
        if (requestedDealerId.HasValue)
            summary["requestedDealerId"] = requestedDealerId.Value;
        _audit.Record("APP_USER", user.Id, "CREATE", null, user.Username, summary);
        _db.SaveChanges();
        if (requestedDealerId.HasValue)
            PostJoinNotification(requestedDealerId.Value, user);
        tx.Commit();
        return user;
    }

    private void SetRequestedDealer(AppUserEntity user, long requestedDealerId)
    {
        user.RequestedDealerId = requestedDealerId;
        _audit.Record("APP_USER", user.Id, "UPDATE", null, user.Username,
            new Dictionary<string, object> { ["requestedDealerId"] = requestedDealerId });
        _db.SaveChanges();
        PostJoinNotification(requestedDealerId, user);
    }

    // Refreshes the stored Google claims from the latest ID token. Email is left alone here
    // (it is normalised elsewhere and the matching path above may have fallen back to it);
    // display name is left alone so a user's manual edit on the profile page is not overwritten
    // on every sign-in.
    private void SyncGoogleIdentity(AppUserEntity user, GoogleIdentity identity)
    {
        var changed = false;
        if (user.GoogleSub != identity.Subject) { user.GoogleSub = identity.Subject; changed = true; }
        var given = Truncate(identity.GivenName, 120);
        if (user.GivenName != given) { user.GivenName = given; changed = true; }
        var family = Truncate(identity.FamilyName, 120);
        if (user.FamilyName != family) { user.FamilyName = family; changed = true; }
        if (user.AvatarUrl != identity.Picture) { user.AvatarUrl = identity.Picture; changed = true; }
        var locale = Truncate(identity.Locale, 16);
        if (user.Locale != locale) { user.Locale = locale; changed = true; }
        if (changed) _db.SaveChanges();
    }

    private static string? Truncate(string? value, int max) =>
        string.IsNullOrEmpty(value) ? null : (value.Length <= max ? value : value[..max]);

    // One notification per fresh request: SetRequestedDealer only runs when nothing is pending.
    private void PostJoinNotification(long dealerId, AppUserEntity user) =>
        _notifications.Create(dealerId, "JOIN_REQUEST", new
        {
            username = user.Username,
            displayName = user.DisplayName,
            email = user.Email
        });

    private string AvailableUsername(string email)
    {
        var local = email.Split('@')[0];
        var kept = new string(local
                .Where(c => char.IsAsciiLetterOrDigit(c) || c is '.' or '_' or '-')
                .ToArray())
            .ToLowerInvariant()
            .Trim('.', '_', '-');

        // The username contract is 3-64 characters with at least one letter, so a numeric or
        // empty local part is prefixed rather than rejected.
        var baseName = kept.Length >= 3 && kept.Any(char.IsAsciiLetter) ? kept : "user" + kept;
        if (baseName.Length > UsernameBaseMaxLength)
            baseName = baseName[..UsernameBaseMaxLength];

        return FirstAvailable(baseName,
            candidate => _db.AppUsers.Any(u => u.Username == candidate),
            (b, n) => $"{b}.{n}");
    }

    private string AvailableDisplayName(string? name, string username)
    {
        var baseName = (name ?? "").Trim();
        if (baseName.Length == 0)
            baseName = username;
        if (baseName.Length > DisplayNameBaseMaxLength)
            baseName = baseName[..DisplayNameBaseMaxLength];

        // Display names are unique in this schema, so two people with the same Google name need
        // a discriminator rather than a failed sign-in.
        return FirstAvailable(baseName,
            candidate => _db.AppUsers.Any(u => EF.Functions.Like(u.DisplayName, candidate)),
            (b, n) => $"{b} ({n})");
    }

    private static string FirstAvailable(string baseName, Func<string, bool> taken, Func<string, int, string> suffixed)
    {
        if (!taken(baseName)) return baseName;

        for (var n = 2; n <= MaxSuffixAttempts; n++)
        {
            var candidate = suffixed(baseName, n);
            if (!taken(candidate)) return candidate;
        }

        // The unique index is the final arbiter; a clash here surfaces as a conflict response.
        return suffixed(baseName, Random.Shared.Next(100_000, 999_999));
    }

    private AppUserEntity? FindForSignIn(string identifier)
    {
        if (identifier.Contains('@'))
        {
            return _db.AppUsers.FirstOrDefault(
                u => u.Email != null && u.Email.ToLower() == identifier.ToLowerInvariant() && u.Active);
        }

        var byUsername = _db.AppUsers.FirstOrDefault(u => u.Username == identifier && u.Active);
        if (byUsername != null) return byUsername;

        var phone = LoginIdentifiers.PhoneOrNull(identifier);
        if (phone == null) return null;
        var byPhone = _db.AppUsers.FirstOrDefault(u => u.Phone == phone && u.Active);
        if (byPhone != null) return byPhone;

        var legacyPhone = LoginIdentifiers.LegacyLocalPhoneOrNull(identifier);
        return legacyPhone == null ? null : _db.AppUsers.FirstOrDefault(u => u.Phone == legacyPhone && u.Active);
    }
}
