using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer;
using DealerOps.Core.Dealer.Dto;
using DealerOps.Core.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Security;

/// <summary>
/// The signed-in user's own account: profile read and update, self-service deletion and the
/// user's own dealership join request. Every change is audited on the APP_USER record.
/// </summary>
[ApiController]
[Route("api/v1")]
[Authorize]
public class MeController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly NotificationService _notifications;
    private readonly JoinRequestService _joinRequests;
    private readonly ILogger<MeController> _logger;

    public MeController(AppDbContext db, IAuditService audit, NotificationService notifications,
        JoinRequestService joinRequests, ILogger<MeController> logger)
    {
        _db = db;
        _audit = audit;
        _notifications = notifications;
        _joinRequests = joinRequests;
        _logger = logger;
    }

    /// <summary>Returns the caller's pending join request, or 204 when none is pending.</summary>
    [HttpGet("me/join-request")]
    public ActionResult<MyJoinRequestResponse> MyJoinRequest()
    {
        var pending = _joinRequests.Current();
        return pending == null ? NoContent() : pending;
    }

    /// <summary>Files a join request to a dealership for the caller's unbound account.</summary>
    [HttpPost("me/join-request")]
    public MyJoinRequestResponse FileJoinRequest([FromBody] FileJoinRequest body) =>
        _joinRequests.File(body.DealerId);

    /// <summary>Returns the caller's identity, contact details and bound dealership.</summary>
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
                appUser?.Email, appUser?.Phone, signInMethod,
                appUser?.GivenName, appUser?.FamilyName, appUser?.AvatarUrl, appUser?.Locale, null);
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
            appUser?.Email, appUser?.Phone, signInMethod,
            appUser?.GivenName, appUser?.FamilyName, appUser?.AvatarUrl, appUser?.Locale, user.DealerRole);
    }

    /// <summary>
    /// Updates the signed-in user's own profile. Only safe-to-self fields change: username,
    /// role and dealer binding stay fixed. Uniqueness is enforced against every other row,
    /// which is why the queries exclude the caller's own id.
    /// </summary>
    [HttpPatch("me")]
    public MeResponse PatchMe([FromBody] PatchMeRequest body)
    {
        var current = TenantContext.Get()
                      ?? throw new ApiException(ErrorCode.Unauthorized, "Unauthorized");
        var username = current.Username;
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
                   ?? throw new ApiException(ErrorCode.NotFound, "Account not found.");

        var displayName = body.DisplayName.Trim();
        // Same canonical form as registration, so the phone stays usable as a sign-in name.
        var phone = string.IsNullOrWhiteSpace(body.Phone) ? null : LoginIdentifiers.Phone(body.Phone);

        if (_db.AppUsers.Any(u => u.Id != user.Id && EF.Functions.Like(u.DisplayName, displayName)))
            throw new ApiException(ErrorCode.DisplayNameTaken, "That full name is already registered.",
                new Dictionary<string, string> { ["displayName"] = "That full name is already registered." });

        if (phone != null && _db.AppUsers.Any(u => u.Id != user.Id && u.Phone == phone))
            throw new ApiException(ErrorCode.PhoneTaken, "That phone number is already registered.",
                new Dictionary<string, string> { ["phone"] = "That phone number is already registered." });

        // The summary holds the changed fields with their new values and previous the old ones,
        // the phone included (AUD-04).
        var summary = new Dictionary<string, object> { ["self"] = true };
        var previous = new Dictionary<string, object?>();
        if (user.DisplayName != displayName)
        {
            summary["displayName"] = displayName;
            previous["displayName"] = user.DisplayName;
        }
        if (user.Phone != phone)
        {
            summary["phone"] = (object?)phone ?? "";
            previous["phone"] = user.Phone;
        }

        user.DisplayName = displayName;
        user.Phone = phone;

        _audit.Record("APP_USER", user.Id, "UPDATE", current.TenantDealerId, username, summary, previous);
        _db.SaveChanges();
        _logger.LogInformation("Profile updated userId={UserId} username={Username} fields={Fields}",
            user.Id, username, string.Join(",", summary.Keys.Where(k => k != "self")));

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
        var current = TenantContext.Get()
                      ?? throw new ApiException(ErrorCode.Unauthorized, "Unauthorized");
        var username = current.Username;
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
                   ?? throw new ApiException(ErrorCode.NotFound, "Account not found.");

        if (user.Role == AppRole.PlatformAdmin)
        {
            _logger.LogWarning("Self-deletion refused for platform admin username={Username}", username);
            throw new ApiException(ErrorCode.Forbidden, "Platform admin accounts cannot delete themselves.");
        }

        using var tx = _db.Database.BeginTransaction();

        foreach (var m in _db.Memberships.Where(m => m.Username == username && m.Active).ToList())
        {
            m.Active = false;
            _audit.Record("MEMBERSHIP", m.Id, "UPDATE", m.DealerId, username,
                new Dictionary<string, object> { ["username"] = username, ["unbound"] = true, ["self"] = true },
                new Dictionary<string, object?> { ["unbound"] = false });
        }

        // This user's own pending join request has nothing left to resolve, so mark it
        // cancelled rather than leaving it in that dealer's inbox. Other applicants' requests
        // to the same dealership are untouched.
        if (user.RequestedDealerId.HasValue)
            _notifications.ResolveByCorrelation(user.RequestedDealerId.Value, "JOIN_REQUEST",
                "username", username, "CANCELLED", username);

        user.Active = false;
        user.DealerId = null;
        user.RequestedDealerId = null;
        // Free the email and phone so the same person can sign up again (via Google or
        // password) and land in a fresh account; the username and audit trail stay for
        // history. Appending ":deleted:<id>" keeps the row unique against anyone else who
        // might cancel too.
        var marker = $":deleted:{user.Id}";
        if (user.Email != null) user.Email = user.Email + marker;
        if (user.Phone != null) user.Phone = user.Phone + marker;
        if (user.GoogleSub != null) user.GoogleSub = user.GoogleSub + marker;

        // Recorded under the dealership the user left, so its manager's log shows the departure.
        _audit.Record("APP_USER", user.Id, "DELETE", current.TenantDealerId, username,
            new Dictionary<string, object> { ["self"] = true, ["active"] = false },
            new Dictionary<string, object?> { ["active"] = true });
        _db.SaveChanges();
        tx.Commit();
        _logger.LogInformation("Account self-deleted userId={UserId} username={Username} dealerId={DealerId}",
            user.Id, username, current.TenantDealerId);

        return NoContent();
    }
}
