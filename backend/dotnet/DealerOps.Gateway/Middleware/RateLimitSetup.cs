using System.Security.Claims;
using System.Threading.RateLimiting;
using DealerOps.Logging;

namespace DealerOps.Gateway.Middleware;

/// <summary>
/// Per-client request limits on the browser API (NFR-07). The gateway is the only browser entry
/// point, so one limiter covers Core and the AI-backed endpoints. Each client gets a one-minute
/// fixed window: a signed-in user is keyed by username, an anonymous caller by client IP. AI calls
/// (ad checks and the assistant) have their own smaller budget because each one reaches the LLM.
/// Buyer-site inquiries have the smallest budget, because each one creates a lead.
/// Over the limit → 429 <c>RATE_LIMITED</c> with <c>Retry-After</c>.
/// </summary>
public static class RateLimitSetup
{
    /// <summary>
    /// Registers the partitioned limiter from <c>dealerops:rateLimits</c>.
    /// </summary>
    /// <param name="builder">The host whose configuration supplies the limits and whose services receive the limiter.</param>
    /// <returns><c>true</c> when limits are enabled and <c>UseRateLimiter</c> must be called.</returns>
    public static bool AddDealerRateLimits(this WebApplicationBuilder builder)
    {
        var section = builder.Configuration.GetSection("dealerops:rateLimits");
        // On by default in deployed environments; local and E2E stacks run Development and opt in.
        var enabled = section.GetValue<bool?>("enabled") ?? !builder.Environment.IsDevelopment();
        if (!enabled) return false;

        var anonymousPerMinute = section.GetValue("anonymousPerMinute", 60);
        var userPerMinute = section.GetValue("userPerMinute", 600);
        var aiPerMinute = section.GetValue("aiPerMinute", 30);
        var inquiryPerMinute = section.GetValue("inquiryPerMinute", 5);

        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                var http = context.HttpContext;
                var requestId = http.Request.Headers[RequestId.Header].FirstOrDefault();
                http.RequestServices.GetRequiredService<ILoggerFactory>()
                    .CreateLogger(typeof(RateLimitSetup))
                    .LogWarning(
                        "Rate limit exceeded requestId={RequestId} clientIp={ClientIp} user={User} {Method} {Path}",
                        RequestId.IsValid(requestId) ? requestId : "",
                        ClientIp(http), Username(http) ?? "anonymous", http.Request.Method, http.Request.Path.Value);
                http.Response.Headers.RetryAfter = "60";
                await http.Response.WriteAsJsonAsync(
                    new { code = "RATE_LIMITED", message = "Too many requests. Wait a minute and try again." },
                    cancellationToken);
            };
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var path = context.Request.Path.Value ?? "";
                if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
                    return RateLimitPartition.GetNoLimiter("unlimited");

                var username = Username(context);
                var client = username != null ? $"user:{username}" : $"ip:{ClientIp(context)}";
                var (bucket, limit) = IsInquiry(context.Request.Method, path) ? ("inquiry", inquiryPerMinute)
                    : IsAiCall(context.Request.Method, path) ? ("ai", aiPerMinute)
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

    private static bool IsInquiry(string method, string path) =>
        HttpMethods.IsPost(method)
        && path.StartsWith("/api/v1/public/", StringComparison.OrdinalIgnoreCase)
        && path.EndsWith("/inquiries", StringComparison.OrdinalIgnoreCase);

    private static string? Username(HttpContext context) =>
        context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub")
            : null;

    // The socket peer. Behind Azure the forwarded-headers middleware (Program.cs) has already set it
    // from the single hop the App Service front end appended; caller-supplied X-Forwarded-For is never read.
    private static string ClientIp(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
