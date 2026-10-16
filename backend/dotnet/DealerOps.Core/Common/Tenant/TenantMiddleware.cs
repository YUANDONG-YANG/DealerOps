using System.Security.Claims;
using System.Text.Json;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer;
using Microsoft.AspNetCore.Http;

namespace DealerOps.Core.Common.Tenant;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantMiddleware> _logger;

    public TenantMiddleware(RequestDelegate next, ILogger<TenantMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        try
        {
            if (context.User.Identity?.IsAuthenticated != true)
            {
                await _next(context);
                return;
            }

            var path = context.Request.Path.Value ?? "";
            var method = context.Request.Method;
            var isMeGet = method.Equals("GET", StringComparison.OrdinalIgnoreCase)
                          && (path.Equals("/api/v1/me", StringComparison.OrdinalIgnoreCase)
                              || path.Equals("/api/v1/me/", StringComparison.OrdinalIgnoreCase));

            var username = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? context.User.FindFirstValue("sub");
            if (string.IsNullOrWhiteSpace(username))
            {
                await WriteError(context, ErrorCode.Unauthorized, "Unauthorized");
                return;
            }

            var roleClaim = context.User.FindFirstValue("roles")
                            ?? context.User.FindFirstValue(ClaimTypes.Role);
            var role = AppRole.FromValue(roleClaim);
            var displayName = context.User.FindFirstValue("name") ?? username;

            if (role == null && !isMeGet)
            {
                _logger.LogWarning("Rejecting request with no supported role username={Username} {Method} {Path}",
                    username, method, path);
                await WriteError(context, ErrorCode.Forbidden, "Forbidden");
                return;
            }

            if (role == AppRole.PlatformAdmin)
            {
                if (!SyncAppUser(db, username, displayName, role, null))
                {
                    await WriteError(context, ErrorCode.Unauthorized, "Unauthorized");
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
                    _logger.LogError("Multiple active memberships username={Username} count={Count}",
                        username, rows.Count);
                    await WriteError(context, ErrorCode.InternalError, "Unexpected server error.");
                    return;
                }

                long? dealerId = rows.Count == 1 ? rows[0].DealerId : null;

                if (!SyncAppUser(db, username, displayName, role, dealerId))
                {
                    await WriteError(context, ErrorCode.Unauthorized, "Unauthorized");
                    return;
                }

                TenantContext.Set(new CurrentUser(username, role, dealerId));
                db.SetTenantDealerId(dealerId);

                if (path.StartsWith("/api/v1/admin", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Rejecting admin request for dealer user username={Username} {Method} {Path}",
                        username, method, path);
                    await WriteError(context, ErrorCode.Forbidden, "Forbidden");
                    return;
                }

                if (!isMeGet && dealerId == null)
                {
                    _logger.LogWarning("Rejecting unbound dealer user username={Username} {Method} {Path}",
                        username, method, path);
                    await WriteError(context, ErrorCode.Forbidden, "Forbidden");
                    return;
                }

                await _next(context);
                return;
            }

            if (!SyncAppUser(db, username, displayName, null, null))
            {
                await WriteError(context, ErrorCode.Unauthorized, "Unauthorized");
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

    private static bool SyncAppUser(AppDbContext db, string username, string displayName,
        AppRole? jwtRole, long? dealerId)
    {
        var user = db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (user == null || !user.Active)
            return false;

        user.DisplayName = displayName.Length > 120 ? displayName[..120] : displayName;
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
