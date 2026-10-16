using System.Text.Json;
using System.Text.Json.Serialization;
using DealerOps.Core.Assistant;
using DealerOps.Core.Audit;
using DealerOps.Core.Catalog;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Compliance;
using DealerOps.Core.Config;
using DealerOps.Core.Customer;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer;
using DealerOps.Core.Integration;
using DealerOps.Core.Lead;
using DealerOps.Core.Listing;
using DealerOps.Core.OpenApi;
using DealerOps.Core.Photo;
using DealerOps.Core.Security;
using DealerOps.Core.Vehicle;
using DealerOps.Core.WorkOrder;
using DealerOps.Logging;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddProvider(new FileLoggerProvider(
    Environment.GetEnvironmentVariable("LOG_DIR")
    ?? Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "../../../log-sum")),
    "dealer-core"));

var connectionString = builder.Configuration["MYSQL_URL"]
                       ?? builder.Configuration.GetConnectionString("Default")
                       ?? "Server=localhost;Port=3306;Database=dealer_core;User=dealer;Password=dealer_dev_only";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

var jwtSecret = JwtSupport.ResolveDevSecret(builder.Configuration);
var jwtKey = JwtSupport.HmacSecret(jwtSecret);

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
            IssuerSigningKey = jwtKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers(options =>
    {
        options.Filters.Add<ApiExceptionFilter>();
        options.ModelBinderProviders.Insert(0, new SnakeCaseEnumModelBinderProvider());
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseUpper));
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// Model-binding failures must use the same {code, message, requestId, fieldErrors} envelope as
// ApiExceptionFilter, otherwise clients receive ASP.NET ProblemDetails and lose per-field errors.
// ModelState keys are dotted paths for nested DTOs ("NewCustomer.Name"), so each segment must be
// camel-cased, not just the first, or the client cannot bind the error to its input.
static string ToCamelPath(string path) =>
    string.Join('.', path.Split('.').Select(segment =>
    {
        var bracket = segment.IndexOf('[');
        return bracket < 0
            ? JsonNamingPolicy.CamelCase.ConvertName(segment)
            : JsonNamingPolicy.CamelCase.ConvertName(segment[..bracket]) + segment[bracket..];
    }));

// System.Text.Json and the binder phrase format errors with internal type names and parser
// positions ("Path: $.make | LineNumber: 0"); those must not reach the browser (contract §1.2).
static string PublicFieldError(Microsoft.AspNetCore.Mvc.ModelBinding.ModelError error) =>
    error.Exception != null
    || error.ErrorMessage.Contains("Path:", StringComparison.Ordinal)
    || error.ErrorMessage.Contains("DealerOps.", StringComparison.Ordinal)
        ? "Invalid value."
        : error.ErrorMessage;

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    // Client errors such as 415 must not become ProblemDetails; UseStatusCodePages below
    // writes the {code, message, requestId} envelope for them instead.
    options.SuppressMapClientErrors = true;
    options.InvalidModelStateResponseFactory = context =>
    {
        var fieldErrors = new Dictionary<string, string>();
        foreach (var (key, entry) in context.ModelState)
        {
            if (entry.Errors.Count == 0) continue;
            var name = key.StartsWith("$.", StringComparison.Ordinal) ? key[2..] : key;
            if (name.Length == 0) name = "request";
            fieldErrors[ToCamelPath(name)] = PublicFieldError(entry.Errors[0]);
        }

        var requestId = context.HttpContext.Items["RequestId"] as string ?? "";
        return new ObjectResult(new ErrorBody(
            ErrorCode.Validation.ToWireCode(), "Validation failed.", requestId, fieldErrors))
        {
            StatusCode = ErrorCode.Validation.HttpStatus()
        };
    };
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.OperationFilter<LoginOperationFilter>();
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DealerOps Gateway API",
        Version = "v1",
        Description = "Public DealerOps API. Use Authorize to provide a JWT Bearer token."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste only the JWT access token. Swagger adds the Bearer prefix."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference
            {
                Type = ReferenceType.SecurityScheme,
                Id = "Bearer"
            }
        }] = Array.Empty<string>()
    });
});
builder.Services.AddHttpContextAccessor();

builder.Services.AddSingleton<JwtService>();
// Singleton so Google's signing keys are fetched and cached once, not per sign-in.
builder.Services.AddSingleton<GoogleIdTokenVerifier>();
// Firebase verifies email/password identity tokens; the service account credential is loaded
// from the runtime environment and must never be committed to the repository.
builder.Services.AddSingleton<FirebaseIdTokenVerifier>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<NewAccountRules>();
builder.Services.AddScoped<DealerAdminService>();
builder.Services.AddScoped<MembershipService>();
builder.Services.AddScoped<JoinRequestService>();
builder.Services.AddScoped<DealerOps.Core.Notifications.NotificationService>();
builder.Services.AddScoped<MemberDirectoryService>();
builder.Services.AddScoped<VehicleService>();
builder.Services.AddScoped<CustomerService>();
builder.Services.AddScoped<LeadService>();
builder.Services.AddScoped<WorkOrderService>();
builder.Services.AddScoped<ListingService>();
// AuditController reads the audit trail through AuditService.List, which is not on
// IAuditService, so the concrete type is registered and the interface resolves to the
// same scoped instance.
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<IAuditService>(sp => sp.GetRequiredService<AuditService>());
builder.Services.AddScoped<ComplianceCheckService>();
builder.Services.AddScoped<OmvicRuleEngine>();
builder.Services.AddScoped<CheckStatusMapper>();
builder.Services.AddSingleton<PhotoEnhancer>();
builder.Services.AddScoped<VehiclePhotoService>();
builder.Services.AddScoped<AssistantService>();
builder.Services.AddScoped<AssistantResourceQuery>();

var aiBaseUrl = builder.Configuration["AiService:BaseUrl"] ?? "http://127.0.0.1:8082";
var internalToken = builder.Configuration["AiService:InternalToken"] ?? "dealer-internal";
builder.Services.AddHttpClient<IAiGatewayClient, AiGatewayClient>(client =>
{
    client.BaseAddress = new Uri(aiBaseUrl);
    client.DefaultRequestHeaders.Add("X-Dealer-Internal", internalToken);
});

var vpicBaseUrl = builder.Configuration["Vpic:BaseUrl"] ?? "https://vpic.nhtsa.dot.gov/api/vehicles/";
if (!vpicBaseUrl.EndsWith('/')) vpicBaseUrl += "/";
// The catalog cache lives in the singleton IMemoryCache, not in the service: the typed client must
// stay transient so its HttpMessageHandler is not captured for the lifetime of the application.
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<VehicleCatalogService>(client =>
{
    client.BaseAddress = new Uri(vpicBaseUrl);
    // The catalog is reachable anonymously, so an unreachable vPIC must fail fast instead of
    // holding the public landing page for the 100-second default.
    client.Timeout = TimeSpan.FromSeconds(5);
});

builder.Services.AddHostedService<AdminSeeder>();
builder.Services.AddHealthChecks();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    // EnsureCreated does nothing when the table already exists, so new columns added after the
    // first create need an idempotent patch. MySQL 8 rejects IF NOT EXISTS on ADD COLUMN, so
    // the exception for a duplicate column (1060) is swallowed.
    // Columns added after the first EnsureCreated. Each ALTER is wrapped so an already-added
    // column is a no-op; MySQL 8 does not support ADD COLUMN IF NOT EXISTS cleanly.
    foreach (var column in new[]
    {
        "ADD COLUMN requested_dealer_id BIGINT NULL",
        "ADD COLUMN google_sub VARCHAR(64) NULL",
        "ADD COLUMN firebase_uid VARCHAR(128) NULL",
        "ADD COLUMN given_name VARCHAR(120) NULL",
        "ADD COLUMN family_name VARCHAR(120) NULL",
        "ADD COLUMN avatar_url TEXT NULL",
        "ADD COLUMN locale VARCHAR(16) NULL",
    })
    {
        try { db.Database.ExecuteSqlRaw($"ALTER TABLE app_user {column}"); }
        catch (Exception ex) when (
            ex.ToString().Contains("Duplicate column", StringComparison.OrdinalIgnoreCase)
            || ex.ToString().Contains("1060", StringComparison.Ordinal))
        { /* already present */ }
    }
    // Existing rows get the catch-all body type so the NOT NULL column can be added without a
    // separate backfill step; the add-vehicle form chooses an explicit value for new rows.
    try { db.Database.ExecuteSqlRaw("ALTER TABLE vehicle ADD COLUMN body_type VARCHAR(16) NOT NULL DEFAULT 'other'"); }
    catch (Exception ex) when (
        ex.ToString().Contains("Duplicate column", StringComparison.OrdinalIgnoreCase)
        || ex.ToString().Contains("1060", StringComparison.Ordinal))
    { /* already present */ }
    foreach (var column in new[]
    {
        "ADD COLUMN prior_use VARCHAR(32) NULL",
        "ADD COLUMN warranty_terms TEXT NULL",
        "ADD COLUMN annual_km_allowance INT NULL",
    })
    {
        try { db.Database.ExecuteSqlRaw($"ALTER TABLE listing {column}"); }
        catch (Exception ex) when (
            ex.ToString().Contains("Duplicate column", StringComparison.OrdinalIgnoreCase)
            || ex.ToString().Contains("1060", StringComparison.Ordinal))
        { /* already present */ }
    }
    // CREATE TABLE IF NOT EXISTS is supported, so the notification table is created in the
    // same idempotent spirit as the ALTER above. Dealer-scoped: queries filter by dealer_id
    // and resolved_at IS NULL to show the inbox; approve/reject flip resolved_at.
    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS notification (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            dealer_id BIGINT NOT NULL,
            kind VARCHAR(32) NOT NULL,
            payload TEXT NOT NULL,
            created_at DATETIME(6) NOT NULL,
            resolved_at DATETIME(6) NULL,
            resolved_by VARCHAR(64) NULL,
            resolved_action VARCHAR(32) NULL,
            INDEX ix_notification_dealer_unresolved (dealer_id, resolved_at)
        )");
}

// The Gateway merges this document into its own, so the JSON is always served; only the
// browser-facing UI is limited to development.
app.UseSwagger();
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("EnableSwagger"))
{
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "DealerOps Core API");
    });
}

app.UseMiddleware<RequestLoggingMiddleware>();
// Framework responses with no body (unknown route, wrong method, non-JSON body) get the same
// error envelope as ApiExceptionFilter (contract §1.2 / §12).
var bodylessErrors = new Dictionary<int, (ErrorCode Code, string Message)>
{
    [404] = (ErrorCode.NotFound, "Not found"),
    [405] = (ErrorCode.MethodNotAllowed, "Method not allowed"),
    [415] = (ErrorCode.UnsupportedMediaType, "Request body must be application/json"),
};
app.UseStatusCodePages(async context =>
{
    var response = context.HttpContext.Response;
    if (!bodylessErrors.TryGetValue(response.StatusCode, out var error)) return;
    var requestId = context.HttpContext.Items["RequestId"] as string ?? "";
    await response.WriteAsJsonAsync(
        new ErrorBody(error.Code.ToWireCode(), error.Message, requestId),
        new JsonSerializerOptions(JsonSerializerDefaults.Web));
});
// No CORS here: the browser only reaches Core through the Gateway (CLAUDE.md). A duplicate
// Access-Control-Allow-Origin header from Core would be proxied back by YARP and overwrite
// the Gateway's specific origin, breaking the browser's CORS check.
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantMiddleware>();
app.MapControllers();
app.MapHealthChecks("/actuator/health");

ReleaseInfo.LogStartup(app.Services.GetRequiredService<ILogger<Program>>(), "core",
    ReleaseInfo.Resolve(builder.Configuration["PUBLISHED_AT"]));

app.Run();
