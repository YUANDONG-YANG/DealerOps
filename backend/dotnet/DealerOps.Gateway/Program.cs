using System.Text;
using System.Text.Json;
using DealerOps.Gateway.Health;
using DealerOps.Gateway.Middleware;
using DealerOps.Gateway.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

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
                 ?? "http://localhost:5173";

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

// YARP
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Health check dependencies
builder.Services.AddHttpClient("health");
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
                             || path.Equals("/api/v1/auth/register", StringComparison.OrdinalIgnoreCase)))
    {
        await next();
        return;
    }
    if (method == "GET" && path.StartsWith("/api/v1/catalog/vin/", StringComparison.OrdinalIgnoreCase))
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
    var roles = context.User.FindFirst("roles")?.Value;
    if (roles != "Platform.Admin" && roles != "Dealer.User")
    {
        context.Response.StatusCode = 401;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(
            JsonSerializer.Serialize(new { code = "UNAUTHORIZED", message = "Unauthorized" }));
        return;
    }

    await next();
});

// Swagger gate: only in dev mode
var devMode = string.Equals(jwtMode.Trim(), "dev", StringComparison.OrdinalIgnoreCase);
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)
        && !devMode)
    {
        context.Response.StatusCode = 404;
        return;
    }
    await next();
});

// Catch-all 404 for unmatched routes (runs after YARP)
app.MapFallback(() => Results.NotFound(new { code = "NOT_FOUND", message = "Not found" }));

app.MapReverseProxy();

app.Run();
