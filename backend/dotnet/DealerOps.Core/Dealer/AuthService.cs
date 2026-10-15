using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;
using DealerOps.Core.Security;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Dealer;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly IAuditService _audit;
    private readonly NewAccountRules _accountRules;
    private readonly string _unknownUserHash;

    public AuthService(AppDbContext db, JwtService jwt, IAuditService audit, NewAccountRules accountRules)
    {
        _db = db;
        _jwt = jwt;
        _audit = audit;
        _accountRules = accountRules;
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
