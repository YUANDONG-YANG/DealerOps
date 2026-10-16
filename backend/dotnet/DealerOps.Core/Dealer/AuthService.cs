using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;
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
    private readonly string _unknownUserHash;

    public AuthService(AppDbContext db, JwtService jwt, IAuditService audit, NewAccountRules accountRules,
        GoogleIdTokenVerifier google)
    {
        _db = db;
        _jwt = jwt;
        _audit = audit;
        _accountRules = accountRules;
        _google = google;
        _unknownUserHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString());
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
        var requestedDealerId = request.DealerId;

        var user = _db.AppUsers.FirstOrDefault(u => u.Email != null && u.Email.ToLower() == email && u.Active);

        // The platform admin is seeded from the environment and keeps password-only sign-in, so
        // control of its mailbox is not enough to reach the admin console (AUTH-15).
        if (user?.Role == AppRole.PlatformAdmin)
            throw new ApiException(ErrorCode.Forbidden, "Sign in with your password as the platform administrator.");

        // Already bound to a dealer: just sign in.
        if (user?.DealerId != null)
            return new GoogleSignInResponse("ok",
                new LoginResponse(_jwt.Issue(user), user.Role!.Value, user.DisplayName));

        if (requestedDealerId.HasValue)
        {
            RequireActiveDealer(requestedDealerId.Value);
            user = user == null
                ? CreateUnboundGoogleUser(email, identity.Name, requestedDealerId.Value)
                : SetRequestedDealer(user, requestedDealerId.Value);
            return new GoogleSignInResponse("pending_approval", null);
        }

        // No dealer picked yet: the UI must show the selector. An already-pending account also
        // reports "pending_approval" so a repeat sign-in does not loop through the selector.
        if (user?.RequestedDealerId != null)
            return new GoogleSignInResponse("pending_approval", null);

        return new GoogleSignInResponse("needs_dealer", null);
    }

    private AppUserEntity CreateUnboundGoogleUser(string email, string? name, long requestedDealerId)
    {
        var username = AvailableUsername(email);
        var user = new AppUserEntity
        {
            Username = username,
            // No password hash: Login treats an empty hash as "cannot sign in with a password",
            // so this account can only ever come back through Google.
            PasswordHash = "",
            DisplayName = AvailableDisplayName(name, username),
            Email = email,
            Phone = null,
            Role = AppRole.DealerUser,
            DealerId = null,
            RequestedDealerId = requestedDealerId,
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
            new Dictionary<string, object>
            {
                ["registration"] = "google",
                ["requestedDealerId"] = requestedDealerId
            });
        _db.SaveChanges();
        tx.Commit();
        return user;
    }

    private AppUserEntity SetRequestedDealer(AppUserEntity user, long requestedDealerId)
    {
        if (user.RequestedDealerId == requestedDealerId) return user;
        user.RequestedDealerId = requestedDealerId;
        _audit.Record("APP_USER", user.Id, "UPDATE", null, user.Username,
            new Dictionary<string, object> { ["requestedDealerId"] = requestedDealerId });
        _db.SaveChanges();
        return user;
    }

    private void RequireActiveDealer(long dealerId)
    {
        if (!_db.Dealers.Any(d => d.Id == dealerId && d.Active))
            throw new ApiException(ErrorCode.NotFound, "Dealership not found.");
    }

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
        return phone == null ? null : _db.AppUsers.FirstOrDefault(u => u.Phone == phone && u.Active);
    }
}
