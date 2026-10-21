using System.Text.Json;
using System.Text.Json.Serialization;
using DealerOps.Core.Assistant;
using DealerOps.Core.Audit;
using DealerOps.Core.BuyerSite;
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
using DealerOps.Core.Payment;
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
using MySqlConnector;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddProvider(new FileLoggerProvider(
    Environment.GetEnvironmentVariable("LOG_DIR")
    ?? Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "../../../log-sum")),
    "dealer-core"));

var connectionString = FirstConfigured(
    builder.Configuration["MYSQL_URL"],
    builder.Configuration.GetConnectionString("Default"));
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "Database connection is not configured. Set MYSQL_URL or ConnectionStrings__Default.");

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
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                if (context.Response.HasStarted) return;
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                var requestId = context.HttpContext.Items["RequestId"] as string ?? "";
                await context.Response.WriteAsJsonAsync(
                    new ErrorBody(ErrorCode.Unauthorized.ToWireCode(), "Unauthorized", requestId),
                    new JsonSerializerOptions(JsonSerializerDefaults.Web));
            },
            OnForbidden = async context =>
            {
                if (context.Response.HasStarted) return;
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                var requestId = context.HttpContext.Items["RequestId"] as string ?? "";
                await context.Response.WriteAsJsonAsync(
                    new ErrorBody(ErrorCode.Forbidden.ToWireCode(), "Forbidden", requestId),
                    new JsonSerializerOptions(JsonSerializerDefaults.Web));
            }
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
        // Integer enum values are not the documented wire form (DMS-05).
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseUpper, allowIntegerValues: false));
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
builder.Services.AddScoped<VehiclePaymentService>();
builder.Services.AddScoped<BuyerSiteService>();
builder.Services.AddScoped<ListingService>();
// AuditController reads the audit trail through AuditService.List, which is not on
// IAuditService, so the concrete type is registered and the interface resolves to the
// same scoped instance.
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<IAuditService>(sp => sp.GetRequiredService<AuditService>());
builder.Services.AddScoped<ComplianceCheckService>();
builder.Services.AddScoped<OmvicRuleEngine>();
builder.Services.AddScoped<ComplianceRuleService>();
builder.Services.AddScoped<CheckStatusMapper>();
builder.Services.AddSingleton<PhotoEnhancer>();
builder.Services.AddScoped<VehiclePhotoService>();
builder.Services.AddScoped<AssistantService>();
builder.Services.AddScoped<AssistantResourceQuery>();

var aiWaitMs = builder.Configuration.GetValue("AiService:ResponseTimeoutMs", 16000);
var aiBaseUrl = builder.Configuration["AiService:BaseUrl"] ?? "http://127.0.0.1:8082";
var internalToken = FirstConfigured(
    builder.Configuration["INTERNAL_TOKEN"],
    builder.Configuration["AiService:InternalToken"]);
if (string.IsNullOrWhiteSpace(internalToken))
    throw new InvalidOperationException(
        "Internal service token is not configured. Set INTERNAL_TOKEN or AiService__InternalToken.");
var internalHeader = FirstConfigured(builder.Configuration["AiService:InternalHeaderName"])
                     ?? "X-Dealer-Internal";
builder.Services.AddHttpClient<IAiGatewayClient, AiGatewayClient>(client =>
{
    client.BaseAddress = new Uri(aiBaseUrl);
    client.DefaultRequestHeaders.Add(internalHeader, internalToken);
    // Longer than the provider's 2s connect + 13s response, so a failure body can be stored
    // instead of Core abandoning the call and leaving an older Passed check in place (AI-02).
    client.Timeout = TimeSpan.FromMilliseconds(aiWaitMs + 1000);
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
builder.Services.AddHostedService<CustomerRetention>();
builder.Services.AddHealthChecks();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS compliance_rule_override (
            rule_id VARCHAR(64) PRIMARY KEY,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            severity VARCHAR(16) NULL,
            message VARCHAR(500) NULL,
            updated_at DATETIME(6) NOT NULL,
            updated_by VARCHAR(64) NOT NULL
        )");
    // EnsureCreated does nothing when the table already exists, so columns added after the first
    // create need an idempotent patch. MySQL 8 rejects IF NOT EXISTS on ADD COLUMN, so the
    // duplicate-column error (1060) is swallowed.
    foreach (var patch in new[]
    {
        "app_user ADD COLUMN requested_dealer_id BIGINT NULL",
        "app_user ADD COLUMN google_sub VARCHAR(64) NULL",
        "app_user ADD COLUMN firebase_uid VARCHAR(128) NULL",
        "app_user ADD COLUMN given_name VARCHAR(120) NULL",
        "app_user ADD COLUMN family_name VARCHAR(120) NULL",
        "app_user ADD COLUMN avatar_url TEXT NULL",
        "app_user ADD COLUMN locale VARCHAR(16) NULL",
        // Existing members become staff; the platform admin promotes managers afterwards.
        "membership ADD COLUMN dealer_role VARCHAR(16) NOT NULL DEFAULT 'staff'",
        "audit_event ADD COLUMN previous_values JSON NULL",
        "audit_event ADD COLUMN client_ip VARCHAR(45) NULL",
        // Existing rows get the catch-all body type so the NOT NULL column needs no backfill;
        // the add-vehicle form chooses an explicit value for new rows.
        "vehicle ADD COLUMN body_type VARCHAR(16) NOT NULL DEFAULT 'other'",
        "vehicle ADD COLUMN mileage_km INT NULL",
        "vehicle ADD COLUMN exterior_color VARCHAR(40) NULL",
        "vehicle ADD COLUMN fuel_type VARCHAR(16) NULL",
        "vehicle ADD COLUMN stock_number VARCHAR(20) NULL",
        "vehicle ADD COLUMN list_price DECIMAL(12,2) NULL",
        "vehicle ADD COLUMN deleted_at DATETIME(6) NULL",
        "customer ADD COLUMN deleted_at DATETIME(6) NULL",
        "listing ADD COLUMN prior_use VARCHAR(32) NULL",
        "listing ADD COLUMN warranty_terms TEXT NULL",
        "listing ADD COLUMN annual_km_allowance INT NULL",
    })
    {
        try { db.Database.ExecuteSqlRaw($"ALTER TABLE {patch}"); }
        catch (Exception ex) when (
            ex.ToString().Contains("Duplicate column", StringComparison.OrdinalIgnoreCase)
            || ex.ToString().Contains("1060", StringComparison.Ordinal))
        { /* already present */ }
    }
    // CREATE TABLE IF NOT EXISTS is supported, so the notification table is created in the
    // same idempotent spirit as the ALTERs above. Dealer-scoped: queries filter by dealer_id
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
    // EnsureCreated does nothing once any table exists, so leads, notes, photos, and work
    // orders are created here for databases that predate those entities. dealer_id stays
    // required. A duplicate index or foreign key on a later start is ignored.
    EnsureTable(db, @"
        CREATE TABLE IF NOT EXISTS sales_lead (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            dealer_id BIGINT NOT NULL,
            customer_id BIGINT NOT NULL,
            vehicle_id BIGINT NULL,
            owner_username VARCHAR(64) NULL,
            stage VARCHAR(16) NOT NULL,
            next_follow_up_on DATE NULL,
            lost_reason VARCHAR(300) NULL,
            version INT NOT NULL DEFAULT 0,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            KEY idx_lead_dealer_stage (dealer_id, stage),
            CONSTRAINT fk_lead_dealer FOREIGN KEY (dealer_id) REFERENCES dealer (id),
            CONSTRAINT fk_lead_customer FOREIGN KEY (customer_id) REFERENCES customer (id),
            CONSTRAINT fk_lead_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (id)
        )");
    EnsureTable(db, @"
        CREATE TABLE IF NOT EXISTS sales_lead_note (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            dealer_id BIGINT NOT NULL,
            lead_id BIGINT NOT NULL,
            author_username VARCHAR(64) NOT NULL,
            body VARCHAR(2000) NOT NULL,
            created_at DATETIME(6) NOT NULL,
            KEY idx_lead_note_lead (lead_id),
            CONSTRAINT fk_lead_note_lead FOREIGN KEY (lead_id) REFERENCES sales_lead (id)
        )");
    EnsureTable(db, @"
        CREATE TABLE IF NOT EXISTS work_order (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            dealer_id BIGINT NOT NULL,
            vehicle_id BIGINT NOT NULL,
            task VARCHAR(200) NOT NULL,
            assignee_username VARCHAR(64) NULL,
            status VARCHAR(16) NOT NULL,
            due_on DATE NULL,
            cost DECIMAL(12,2) NULL,
            completion_note VARCHAR(500) NULL,
            completed_on DATE NULL,
            version INT NOT NULL DEFAULT 0,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            KEY idx_work_order_vehicle (dealer_id, vehicle_id, status),
            CONSTRAINT fk_work_order_dealer FOREIGN KEY (dealer_id) REFERENCES dealer (id),
            CONSTRAINT fk_work_order_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (id)
        )");
    EnsureTable(db, @"
        CREATE TABLE IF NOT EXISTS vehicle_photo (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            dealer_id BIGINT NOT NULL,
            vehicle_id BIGINT NOT NULL,
            content_type VARCHAR(32) NOT NULL,
            original_data MEDIUMBLOB NOT NULL,
            enhanced_data MEDIUMBLOB NULL,
            enhancement VARCHAR(16) NULL,
            uploaded_by VARCHAR(64) NOT NULL,
            created_at DATETIME(6) NOT NULL,
            KEY idx_vehicle_photo_vehicle (dealer_id, vehicle_id),
            CONSTRAINT fk_vehicle_photo_dealer FOREIGN KEY (dealer_id) REFERENCES dealer (id),
            CONSTRAINT fk_vehicle_photo_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (id)
        )");
    EnsureTable(db, @"
        CREATE TABLE IF NOT EXISTS vehicle_payment (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            dealer_id BIGINT NOT NULL,
            vehicle_id BIGINT NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            method VARCHAR(16) NOT NULL,
            paid_on DATE NOT NULL,
            note VARCHAR(200) NULL,
            recorded_by VARCHAR(64) NOT NULL,
            created_at DATETIME(6) NOT NULL,
            KEY idx_vehicle_payment_vehicle (dealer_id, vehicle_id),
            CONSTRAINT fk_vehicle_payment_dealer FOREIGN KEY (dealer_id) REFERENCES dealer (id),
            CONSTRAINT fk_vehicle_payment_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (id)
        )");
    foreach (var ddl in new[]
    {
        // Tables created by an older EnsureCreated have a nullable dealer_id.
        "ALTER TABLE sales_lead MODIFY dealer_id BIGINT NOT NULL",
        "ALTER TABLE sales_lead_note MODIFY dealer_id BIGINT NOT NULL",
        "ALTER TABLE work_order MODIFY dealer_id BIGINT NOT NULL",
        "ALTER TABLE vehicle_photo MODIFY dealer_id BIGINT NOT NULL",
        "ALTER TABLE sales_lead ADD KEY idx_lead_dealer_stage (dealer_id, stage)",
        "ALTER TABLE sales_lead ADD CONSTRAINT fk_lead_dealer FOREIGN KEY (dealer_id) REFERENCES dealer (id)",
        "ALTER TABLE sales_lead ADD CONSTRAINT fk_lead_customer FOREIGN KEY (customer_id) REFERENCES customer (id)",
        "ALTER TABLE sales_lead ADD CONSTRAINT fk_lead_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (id)",
        "ALTER TABLE sales_lead_note ADD KEY idx_lead_note_lead (lead_id)",
        "ALTER TABLE sales_lead_note ADD CONSTRAINT fk_lead_note_lead FOREIGN KEY (lead_id) REFERENCES sales_lead (id)",
        "ALTER TABLE work_order ADD KEY idx_work_order_vehicle (dealer_id, vehicle_id, status)",
        "ALTER TABLE work_order ADD CONSTRAINT fk_work_order_dealer FOREIGN KEY (dealer_id) REFERENCES dealer (id)",
        "ALTER TABLE work_order ADD CONSTRAINT fk_work_order_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (id)",
        "ALTER TABLE vehicle_photo ADD KEY idx_vehicle_photo_vehicle (dealer_id, vehicle_id)",
        "ALTER TABLE vehicle_photo ADD CONSTRAINT fk_vehicle_photo_dealer FOREIGN KEY (dealer_id) REFERENCES dealer (id)",
        "ALTER TABLE vehicle_photo ADD CONSTRAINT fk_vehicle_photo_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (id)",
    })
    {
        try { db.Database.ExecuteSqlRaw(ddl); }
        // 1061/1022/1826: the index or foreign key already exists.
        catch (MySqlException ex) when (ex.Number is 1061 or 1022 or 1826) { }
        // 1452/1138/1265: existing rows (an orphan or a NULL dealer_id) block the constraint.
        // Core still starts; the warning names the statement to repair by hand.
        catch (MySqlException ex) when (ex.Number is 1452 or 1138 or 1265)
        {
            app.Logger.LogWarning("Schema upgrade skipped, existing rows block it: {Ddl} ({Error})", ddl, ex.Message);
        }
    }
}

static string? FirstConfigured(params string?[] values)
{
    foreach (var value in values)
        if (!string.IsNullOrWhiteSpace(value)) return value;
    return null;
}

static void EnsureTable(AppDbContext db, string sql) => db.Database.ExecuteSqlRaw(sql);

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var error = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        if (error is OperationCanceledException) return;
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger("DealerOps.Core");
        logger.LogError(error, "Unhandled exception");
        if (context.Response.HasStarted) return;
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        var requestId = context.Items["RequestId"] as string ?? "";
        await context.Response.WriteAsJsonAsync(
            new ErrorBody(ErrorCode.InternalError.ToWireCode(), "Unexpected server error.", requestId),
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
    });
});
// Before Swagger and controllers: a direct caller without the gateway credential is 404.
app.UseMiddleware<InternalCallerGuard>();

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
