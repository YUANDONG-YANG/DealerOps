using System.Security.Claims;
using System.Text.Json;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer;
using Microsoft.AspNetCore.Http;

namespace DealerOps.Core.Common.Tenant;

/// <summary>
/// Resolves the signed-in account and its dealership for the request. A missing subject, an
/// inactive account, an unsupported role, an unbound dealer user outside their own account
/// routes, or a dealer user on an admin route is rejected here. The context is cleared when
/// the request ends.
/// </summary>
public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantMiddleware> _logger;

    public TenantMiddleware(RequestDelegate next, ILogger<TenantMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>Establishes <see cref="TenantContext"/> for an authenticated request, then calls the rest of the pipeline.</summary>
    /// <param name="context">The current HTTP request.</param>
    /// <param name="db">The request-scoped database context used to load membership and sync the account.</param>
    /// <returns>A task that completes when the rest of the pipeline completes.</returns>
    /// <exception cref="Exception">Auth rejections are written as error bodies. Failures from the rest of the pipeline propagate.</exception>
    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        // TenantGuard is static, so it cannot be an ILogger<T> type argument. Denial
        // messages still name the reason, username, and dealer id.
        TenantGuard.UseLogger(_logger);
        try
        {
            if (context.User.Identity?.IsAuthenticated != true)
            {
                await _next(context);
                return;
            }

            var path = context.Request.Path.Value ?? "";
            var method = context.Request.Method;
            // /me and /me/join-request are the caller's own account. An unbound user may
            // read, edit, or delete the account and file one dealership join request.
            var isMe = path.Equals("/api/v1/me", StringComparison.OrdinalIgnoreCase)
                       || path.Equals("/api/v1/me/join-request", StringComparison.OrdinalIgnoreCase);
            var isMeGet = isMe && method.Equals("GET", StringComparison.OrdinalIgnoreCase);

            var username = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? context.User.FindFirstValue("sub");
            if (string.IsNullOrWhiteSpace(username))
            {
                // The token had no subject. The token itself is not logged.
                _logger.LogWarning(
                    "Access denied username={Username} dealerId={DealerId} method={Method} path={Path} reason={Reason} outcome={Outcome}",
                    "anonymous", null, method, path, "missing_subject", "unauthorized");
                await WriteError(context, ErrorCode.Unauthorized, "Unauthorized");
                return;
            }

            Task RejectInactive(long? dealerId)
            {
                _logger.LogWarning(
                    "Access denied username={Username} dealerId={DealerId} method={Method} path={Path} reason={Reason} outcome={Outcome}",
                    username, dealerId, method, path, "account_missing_or_inactive", "unauthorized");
                return WriteError(context, ErrorCode.Unauthorized, "Unauthorized");
            }

            var roleClaim = context.User.FindFirstValue("roles")
                            ?? context.User.FindFirstValue(ClaimTypes.Role);
            var role = AppRole.FromValue(roleClaim);

            if (role == null && !isMeGet)
            {
                _logger.LogWarning(
                    "Rejecting request with no supported role username={Username} method={Method} path={Path} reason={Reason} outcome={Outcome}",
                    username, method, path, "unsupported_role", "forbidden");
                await WriteError(context, ErrorCode.Forbidden, "Forbidden");
                return;
            }

            if (role == AppRole.PlatformAdmin)
            {
                if (!SyncAppUser(db, username, role, null))
                {
                    await RejectInactive(null);
                    return;
                }
                TenantContext.Set(new CurrentUser(username, role, null));
                await _next(context);
                return;
            }

            if (role == AppRole.DealerUser)
            {
                var rows = db.Memberships
                    .Where(m => m.Username == username && m.Active)
                    .ToList();

                if (rows.Count >= 2)
                {
                    _logger.LogError(
                        "Multiple active memberships username={Username} count={Count} dealerId={DealerId} reason={Reason} outcome={Outcome}",
                        username, rows.Count, null, "multiple_memberships", "internal_error");
                    await WriteError(context, ErrorCode.InternalError, "Unexpected server error.");
                    return;
                }

                long? dealerId = rows.Count == 1 ? rows[0].DealerId : null;

                if (!SyncAppUser(db, username, role, dealerId))
                {
                    await RejectInactive(dealerId);
                    return;
                }

                TenantContext.Set(new CurrentUser(username, role, dealerId, rows.Count == 1 ? rows[0].DealerRole : null));
                db.SetTenantDealerId(dealerId);

                if (path.StartsWith("/api/v1/admin", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning(
                        "Rejecting admin request for dealer user username={Username} dealerId={DealerId} method={Method} path={Path} reason={Reason} outcome={Outcome}",
                        username, dealerId, method, path, "dealer_user_on_admin_route", "forbidden");
                    await WriteError(context, ErrorCode.Forbidden, "Forbidden");
                    return;
                }

                if (!isMe && dealerId == null)
                {
                    _logger.LogWarning(
                        "Rejecting unbound dealer user username={Username} dealerId={DealerId} method={Method} path={Path} reason={Reason} outcome={Outcome}",
                        username, dealerId, method, path, "unbound", "forbidden");
                    await WriteError(context, ErrorCode.Forbidden, "Forbidden");
                    return;
                }

                await _next(context);
                return;
            }

            if (!SyncAppUser(db, username, null, null))
            {
                await RejectInactive(null);
                return;
            }
            TenantContext.Set(new CurrentUser(username, null, null));
            await _next(context);
        }
        finally
        {
            TenantContext.Clear();
        }
    }

    // The display name is not copied from the token: PATCH /me changes it, and a token issued
    // before that edit would otherwise revert it on the next request.
    private static bool SyncAppUser(AppDbContext db, string username, AppRole? jwtRole, long? dealerId)
    {
        var user = db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (user == null || !user.Active)
            return false;

        if (jwtRole != null)
            user.Role = jwtRole;
        user.DealerId = jwtRole == AppRole.PlatformAdmin ? null : dealerId;
        db.SaveChanges();
        return true;
    }

    private static async Task WriteError(HttpContext context, ErrorCode code, string message)
    {
        context.Response.StatusCode = code.HttpStatus();
        context.Response.ContentType = "application/json";
        var requestId = context.Items["RequestId"] as string ?? "";
        var body = new ErrorBody(code.ToWireCode(), message, requestId);
        await JsonSerializer.SerializeAsync(context.Response.Body, body,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }
}
