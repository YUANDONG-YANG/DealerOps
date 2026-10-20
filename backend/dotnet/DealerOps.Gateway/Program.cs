using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DealerOps.Gateway.Health;
using DealerOps.Gateway.Middleware;
using DealerOps.Gateway.Security;
using DealerOps.Logging;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using Yarp.ReverseProxy.Forwarder;
using Yarp.ReverseProxy.Transforms;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddProvider(new FileLoggerProvider(
    Environment.GetEnvironmentVariable("LOG_DIR")
    ?? Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "../../../log-sum")),
    "dealer-gateway"));

var gatewayPort = builder.Configuration["GATEWAY_PORT"] ?? "8080";
builder.WebHost.UseUrls($"http://*:{gatewayPort}");

// Override YARP cluster addresses from env vars
var coreUrl = builder.Configuration["CORE_URL"];
if (!string.IsNullOrEmpty(coreUrl))
    builder.Configuration["ReverseProxy:Clusters:core:Destinations:primary:Address"] = coreUrl;

var aiUrl = builder.Configuration["AI_URL"];
if (!string.IsNullOrEmpty(aiUrl))
    builder.Configuration["ReverseProxy:Clusters:ai:Destinations:primary:Address"] = aiUrl;

// JWT auth
var jwtSecret = JwtSupport.ResolveDevSecret(builder.Configuration);
var jwtMode = builder.Configuration["JWT_MODE"]
              ?? builder.Configuration["dealerops:jwt:mode"]
              ?? "dev";

if (!string.Equals(jwtMode.Trim(), "dev", StringComparison.OrdinalIgnoreCase))
{
    throw new InvalidOperationException(
        "JWT_MODE must be 'dev'. The local HS256 decoder is the only JWT mode.");
}

var signingKey = JwtSupport.HmacSecret(jwtSecret);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = JwtSupport.Issuer,
            ValidateAudience = true,
            ValidAudience = JwtSupport.DefaultAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        options.Events = new JwtBearerEvents
        {
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                return context.Response.WriteAsync(
                    JsonSerializer.Serialize(new { code = "UNAUTHORIZED", message = "Unauthorized" }));
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";
                return context.Response.WriteAsync(
                    JsonSerializer.Serialize(new { code = "FORBIDDEN", message = "Forbidden" }));
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ApiRole", policy =>
        policy.RequireAssertion(context =>
        {
            var rolesClaim = context.User.FindFirst("roles")?.Value;
            if (rolesClaim == null) return false;
            return rolesClaim == "Platform.Admin" || rolesClaim == "Dealer.User";
        }));
});

// CORS
var corsOrigin = builder.Configuration["CORS_ALLOWED_ORIGIN"]
                 ?? builder.Configuration["dealerops:corsAllowedOrigin"]
                 ?? "http://localhost:5174";

builder.Services.AddCors(options =>
{
    options.AddPolicy("Gateway", policy =>
    {
        policy.WithOrigins(corsOrigin.Trim())
            .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .WithHeaders("Authorization", "Content-Type")
            .DisallowCredentials();
    });
});

var internalHeaderName = builder.Configuration["dealerops:internalHeaderName"] ?? "X-Dealer-Internal";
var internalToken = FirstConfigured(
    builder.Configuration["INTERNAL_TOKEN"],
    builder.Configuration["dealerops:internalToken"]);
if (string.IsNullOrWhiteSpace(internalToken))
    throw new InvalidOperationException(
        "INTERNAL_TOKEN is not configured. Set INTERNAL_TOKEN or dealerops__internalToken.");

// YARP. The browser never sends the internal credential (InternalRouteFilter rejects it on
// /api/v1). Stamp it only on the outbound proxy so Core and AI can require it.
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(context =>
    {
        context.AddRequestTransform(transformContext =>
        {
            transformContext.ProxyRequest.Headers.Remove(internalHeaderName);
            transformContext.ProxyRequest.Headers.TryAddWithoutValidation(internalHeaderName, internalToken);
            return ValueTask.CompletedTask;
        });
    });

// Health and OpenAPI fetches are server-side, so they carry the same credential.
builder.Services.AddHttpClient("health", client =>
{
    client.DefaultRequestHeaders.TryAddWithoutValidation(internalHeaderName, internalToken);
});
builder.Services.AddHttpClient("swagger", client =>
{
    client.DefaultRequestHeaders.TryAddWithoutValidation(internalHeaderName, internalToken);
});
builder.Services.AddSingleton<DownstreamHealthCheck>();

var app = builder.Build();

// Middleware pipeline order matters
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseCors("Gateway");
app.UseMiddleware<InternalRouteFilter>();

// Health and release endpoints (before auth so they're public)
app.MapGet("/actuator/health", async (DownstreamHealthCheck healthCheck) =>
    Results.Ok(await healthCheck.CheckAsync()));

app.MapGet("/actuator/release", async (DownstreamHealthCheck healthCheck) =>
    Results.Ok(await healthCheck.ReleaseAsync()));

app.UseAuthentication();
app.UseAuthorization();

// One Gateway OpenAPI document. Only Core operations are browser-facing: the AI service's
// /internal/v1/** routes are core-to-AI only and are not browser Swagger operations.
app.MapGet("/swagger/v1/swagger.json", async (IHttpClientFactory httpClientFactory,
    DownstreamHealthCheck healthCheck) =>
{
    var corePublishedAt = await healthCheck.CorePublishedAtAsync();
    var http = httpClientFactory.CreateClient("swagger");
    var coreUrl = builder.Configuration["CORE_URL"] ?? "http://localhost:8081";

    var core = JsonNode.Parse(await http.GetStringAsync($"{coreUrl}/swagger/v1/swagger.json"))!.AsObject();
    core["info"]!["title"] = "DealerOps Gateway API";
    core["info"]!["description"] =
        $"Core backend API through the Gateway. Core published {corePublishedAt}.";

    return Results.Json(core);
});

// Role gate: authenticated /api/v1/** must have Platform.Admin or Dealer.User
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    if (!path.StartsWith("/api/v1", StringComparison.OrdinalIgnoreCase))
    {
        await next();
        return;
    }

    // Public paths
    var method = context.Request.Method;
    if (method == "OPTIONS")
    {
        await next();
        return;
    }
    if (method == "POST" && (path.Equals("/api/v1/auth/login", StringComparison.OrdinalIgnoreCase)
                             || path.Equals("/api/v1/auth/register", StringComparison.OrdinalIgnoreCase)
                             || path.Equals("/api/v1/auth/google", StringComparison.OrdinalIgnoreCase)
                             || path.Equals("/api/v1/auth/firebase", StringComparison.OrdinalIgnoreCase)))
    {
        await next();
        return;
    }
    if (method == "GET" && path.StartsWith("/api/v1/catalog/", StringComparison.OrdinalIgnoreCase))
    {
        await next();
        return;
    }

    // Must be authenticated
    if (context.User.Identity?.IsAuthenticated != true)
    {
        context.Response.StatusCode = 401;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(
            JsonSerializer.Serialize(new { code = "UNAUTHORIZED", message = "Unauthorized" }));
        return;
    }

    // Must have a valid role
    // JwtBearer may map the custom roles claim to ClaimTypes.Role.
    var roles = context.User.FindFirst("roles")?.Value
                ?? context.User.FindFirst(ClaimTypes.Role)?.Value;
    if (roles != "Platform.Admin" && roles != "Dealer.User")
    {
        context.Response.StatusCode = 401;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(
            JsonSerializer.Serialize(new { code = "UNAUTHORIZED", message = "Unauthorized" }));
        return;
    }

    // AUTH-08: the platform admin owns no business data. Core also rejects it; the Gateway
    // gates it here so no business route is reachable with an admin token.
    if (roles == "Platform.Admin"
        && !path.StartsWith("/api/v1/admin", StringComparison.OrdinalIgnoreCase)
        && !path.StartsWith("/api/v1/me", StringComparison.OrdinalIgnoreCase)
        && !path.StartsWith("/api/v1/auth", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = 403;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(
            JsonSerializer.Serialize(new { code = "FORBIDDEN", message = "Forbidden" }));
        return;
    }

    await next();
});

// Swagger gate: only in dev mode
var devMode = string.Equals(jwtMode.Trim(), "dev", StringComparison.OrdinalIgnoreCase);
if (devMode)
{
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "DealerOps Gateway API");
    });
}
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    if ((path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/ai-swagger", StringComparison.OrdinalIgnoreCase))
        && !devMode)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsJsonAsync(
            new { code = "NOT_FOUND", message = "Not found" },
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return;
    }
    await next();
});

// A destination that never answers would otherwise be a bodyless 502. Keep that status and
// write the same {code, message} envelope. A downstream body is left as the destination sent it.
app.Use(async (context, next) =>
{
    await next();
    if (context.Features.Get<IForwarderErrorFeature>() is null || context.Response.HasStarted)
        return;
    if (context.Response.StatusCode < 400)
        context.Response.StatusCode = StatusCodes.Status502BadGateway;
    await context.Response.WriteAsJsonAsync(
        new { code = "INTERNAL_ERROR", message = "Unexpected server error." },
        new JsonSerializerOptions(JsonSerializerDefaults.Web));
});

// Catch-all 404 for unmatched routes (runs after YARP)
app.MapFallback(() => Results.NotFound(new { code = "NOT_FOUND", message = "Not found" }));

app.MapReverseProxy();

ReleaseInfo.LogStartup(app.Services.GetRequiredService<ILogger<Program>>(), "gateway",
    app.Services.GetRequiredService<DownstreamHealthCheck>().GatewayPublishedAt);

app.Run();

static string? FirstConfigured(params string?[] values)
{
    foreach (var value in values)
        if (!string.IsNullOrWhiteSpace(value)) return value;
    return null;
}
