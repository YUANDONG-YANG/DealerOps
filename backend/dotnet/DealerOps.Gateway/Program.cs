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
builder.Services.AddHttpClient("swagger");
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

// One Gateway OpenAPI document: merge Core and AI operations for the frontend.
app.MapGet("/swagger/v1/swagger.json", async (IHttpClientFactory httpClientFactory,
    DownstreamHealthCheck healthCheck) =>
{
    var corePublishedAt = await healthCheck.CorePublishedAtAsync();
    var http = httpClientFactory.CreateClient("swagger");
    var coreUrl = builder.Configuration["CORE_URL"] ?? "http://localhost:8081";
    var aiUrl = builder.Configuration["AI_URL"] ?? "http://localhost:8082";

    var core = JsonNode.Parse(await http.GetStringAsync($"{coreUrl}/swagger/v1/swagger.json"))!.AsObject();
    var ai = JsonNode.Parse(await http.GetStringAsync($"{aiUrl}/swagger/v1/swagger.json"))!.AsObject();

    MergeObject(core, ai, "paths");
    MergeArray(core, ai, "tags");
    MergeObject(core, ai, "components", nested: true);
    core["info"]!["title"] = "DealerOps Gateway API";
    core["info"]!["description"] =
        $"Unified Core and AI backend API through the Gateway. Core published {corePublishedAt}.";

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
                             || path.Equals("/api/v1/auth/google", StringComparison.OrdinalIgnoreCase)))
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

    // AUTH-08: the platform admin owns no business data. Core already rejects it, but the
    // /api/v1/ai/** routes proxy straight to the AI service, so the Gateway must gate it here.
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
        context.Response.StatusCode = 404;
        return;
    }
    await next();
});

// Catch-all 404 for unmatched routes (runs after YARP)
app.MapFallback(() => Results.NotFound(new { code = "NOT_FOUND", message = "Not found" }));

app.MapReverseProxy();

ReleaseInfo.LogStartup(app.Services.GetRequiredService<ILogger<Program>>(), "gateway",
    app.Services.GetRequiredService<DownstreamHealthCheck>().GatewayPublishedAt);

app.Run();

static void MergeObject(JsonObject target, JsonObject source, string property, bool nested = false)
{
    if (nested)
    {
        var targetObject = target[property]?.AsObject() ?? new JsonObject();
        var sourceObject = source[property]?.AsObject();
        if (sourceObject == null) return;
        foreach (var (key, value) in sourceObject)
        {
            if (value is JsonObject subSource && targetObject[key] is JsonObject subTarget)
            {
                foreach (var (subKey, subValue) in subSource)
                    subTarget[subKey] = subValue?.DeepClone();
            }
            else
            {
                targetObject[key] = value?.DeepClone();
            }
        }
        target[property] = targetObject;
        return;
    }

    var targetMap = target[property]?.AsObject() ?? new JsonObject();
    var sourceMap = source[property]?.AsObject();
    if (sourceMap == null) return;
    foreach (var (key, value) in sourceMap)
        targetMap[key] = value?.DeepClone();
    target[property] = targetMap;
}

static void MergeArray(JsonObject target, JsonObject source, string property)
{
    var targetArray = target[property]?.AsArray() ?? new JsonArray();
    var sourceArray = source[property]?.AsArray();
    if (sourceArray == null) return;
    foreach (var value in sourceArray)
        targetArray.Add(value?.DeepClone());
    target[property] = targetArray;
}
