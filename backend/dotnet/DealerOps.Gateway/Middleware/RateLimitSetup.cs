using System.Security.Claims;
using System.Threading.RateLimiting;

namespace DealerOps.Gateway.Middleware;

/// <summary>
/// Per-client request limits on the browser API (NFR-07). The gateway is the only browser entry
/// point, so one limiter covers Core and the AI-backed endpoints. Each client gets a one-minute
/// fixed window: a signed-in user is keyed by username, an anonymous caller by client IP. AI calls
/// (ad checks and the assistant) have their own smaller budget because each one reaches the LLM.
/// Over the limit → 429 <c>RATE_LIMITED</c> with <c>Retry-After</c>.
/// </summary>
public static class RateLimitSetup
{
    public static bool AddDealerRateLimits(this WebApplicationBuilder builder)
    {
        var section = builder.Configuration.GetSection("dealerops:rateLimits");
        // On by default in deployed environments; local and E2E stacks run Development and opt in.
        var enabled = section.GetValue<bool?>("enabled") ?? !builder.Environment.IsDevelopment();
        if (!enabled) return false;

        var anonymousPerMinute = section.GetValue("anonymousPerMinute", 60);
        var userPerMinute = section.GetValue("userPerMinute", 600);
        var aiPerMinute = section.GetValue("aiPerMinute", 30);

        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.Headers.RetryAfter = "60";
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { code = "RATE_LIMITED", message = "Too many requests. Wait a minute and try again." },
                    cancellationToken);
            };
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var path = context.Request.Path.Value ?? "";
                if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
                    return RateLimitPartition.GetNoLimiter("unlimited");

                var username = context.User.Identity?.IsAuthenticated == true
                    ? context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub")
                    : null;
                var client = username != null ? $"user:{username}" : $"ip:{ClientIp(context)}";
                var (bucket, limit) = IsAiCall(context.Request.Method, path) ? ("ai", aiPerMinute)
                    : username != null ? ("api", userPerMinute)
                    : ("anonymous", anonymousPerMinute);

                return RateLimitPartition.GetFixedWindowLimiter($"{bucket}|{client}", _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = limit,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    });
            });
        });
        return true;
    }

    private static bool IsAiCall(string method, string path) =>
        HttpMethods.IsPost(method)
        && (path.Equals("/api/v1/assistant/ask", StringComparison.OrdinalIgnoreCase)
            || (path.StartsWith("/api/v1/listings/", StringComparison.OrdinalIgnoreCase)
                && path.EndsWith("/checks", StringComparison.OrdinalIgnoreCase)));

    // Azure App Service appends the caller's address to X-Forwarded-For, so the last entry is the
    // one its front end saw; earlier entries can be set by the caller and are not trusted.
    private static string ClientIp(HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)[^1];
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
