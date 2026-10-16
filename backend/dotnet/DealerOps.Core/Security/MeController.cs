using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Security;

[ApiController]
[Route("api/v1")]
[Authorize]
public class MeController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public MeController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    [HttpGet("me")]
    public MeResponse Me()
    {
        var user = TenantContext.Get()
                   ?? throw new ApiException(ErrorCode.Unauthorized, "Unauthorized");
        var appUser = _db.AppUsers.FirstOrDefault(u => u.Username == user.Username);
        var displayName = appUser?.DisplayName ?? "";
        var signInMethod = string.IsNullOrEmpty(appUser?.PasswordHash) ? "google" : "password";

        if (user.Role == AppRole.PlatformAdmin)
        {
            return new MeResponse(
                user.Username, displayName, AppRole.PlatformAdmin.Value,
                null, null, null, null, null, null,
                appUser?.Email, appUser?.Phone, signInMethod);
        }

        var roleValue = user.Role == AppRole.DealerUser ? AppRole.DealerUser.Value : null;
        var dealerId = user.TenantDealerId;
        DealerEntity? dealer = dealerId.HasValue
            ? _db.Dealers.Find(dealerId.Value)
            : null;

        return new MeResponse(
            user.Username, displayName, roleValue, dealerId,
            dealer?.LegalName, dealer?.ContactPhone,
            dealer?.ContactEmail, dealer?.ContactAddress,
            dealer?.LogoDataUrl,
            appUser?.Email, appUser?.Phone, signInMethod);
    }

    /// <summary>
    /// Updates the signed-in user's own profile. Only safe-to-self fields change: username,
    /// role and dealer binding stay fixed. Uniqueness is enforced against every other row,
    /// which is why the queries exclude the caller's own id.
    /// </summary>
    [HttpPatch("me")]
    public MeResponse PatchMe([FromBody] PatchMeRequest body)
    {
        var username = TenantContext.Get()?.Username
                       ?? throw new ApiException(ErrorCode.Unauthorized, "Unauthorized");
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
                   ?? throw new ApiException(ErrorCode.NotFound, "Account not found.");

        var displayName = body.DisplayName.Trim();
        var phone = string.IsNullOrWhiteSpace(body.Phone) ? null : body.Phone.Trim();

        if (_db.AppUsers.Any(u => u.Id != user.Id && EF.Functions.Like(u.DisplayName, displayName)))
            throw new ApiException(ErrorCode.DisplayNameTaken, "That full name is already registered.",
                new Dictionary<string, string> { ["displayName"] = "That full name is already registered." });

        if (phone != null && _db.AppUsers.Any(u => u.Id != user.Id && u.Phone == phone))
            throw new ApiException(ErrorCode.PhoneTaken, "That phone number is already registered.",
                new Dictionary<string, string> { ["phone"] = "That phone number is already registered." });

        user.DisplayName = displayName;
        user.Phone = phone;

        _audit.Record("APP_USER", user.Id, "UPDATE", null, username,
            new Dictionary<string, object> { ["self"] = true });
        _db.SaveChanges();

        return Me();
    }

    /// <summary>
    /// Soft-deletes the signed-in user's own account: memberships are deactivated, pending
    /// join requests resolved as cancelled, and the row flipped inactive so the username is
    /// retired without touching audit trail or history that references it. After this returns,
    /// the client must discard its token; sign-in with the same credentials will fail.
    /// </summary>
    [HttpDelete("me")]
    public IActionResult DeleteMe()
    {
        var username = TenantContext.Get()?.Username
                       ?? throw new ApiException(ErrorCode.Unauthorized, "Unauthorized");
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
                   ?? throw new ApiException(ErrorCode.NotFound, "Account not found.");

        if (user.Role == AppRole.PlatformAdmin)
            throw new ApiException(ErrorCode.Forbidden, "Platform admin accounts cannot delete themselves.");

        using var tx = _db.Database.BeginTransaction();

        foreach (var m in _db.Memberships.Where(m => m.Username == username && m.Active).ToList())
            m.Active = false;

        // Pending join notifications addressed to any dealership now have nothing to resolve,
        // so mark them cancelled rather than leaving them to haunt that dealer's inbox.
        if (user.RequestedDealerId.HasValue)
        {
            foreach (var row in _db.Notifications
                .Where(n => n.DealerId == user.RequestedDealerId
                            && n.Kind == "JOIN_REQUEST"
                            && n.ResolvedAt == null)
                .ToList())
            {
                row.ResolvedAt = DateTime.UtcNow;
                row.ResolvedBy = username;
                row.ResolvedAction = "CANCELLED";
            }
        }

        user.Active = false;
        user.DealerId = null;
        user.RequestedDealerId = null;

        _audit.Record("APP_USER", user.Id, "DELETE", null, username,
            new Dictionary<string, object> { ["self"] = true });
        _db.SaveChanges();
        tx.Commit();

        return NoContent();
    }
}
