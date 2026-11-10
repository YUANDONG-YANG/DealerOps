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
                // A presented token that fails validation never reaches the action. The access
                // line only has the status. Log the exception type, never the token or the message.
                if (context.AuthenticateFailure is { } failure)
                {
                    PipelineLogger(context.HttpContext).LogWarning(
                        "Rejected JWT reason={Reason} method={Method} path={Path} [{RequestId}]",
                        failure.GetType().Name,
                        context.Request.Method,
                        context.Request.Path,
                        context.HttpContext.Items["RequestId"] as string ?? "");
                }

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
                PipelineLogger(context.HttpContext).LogWarning(
                    "Forbidden method={Method} path={Path} [{RequestId}]",
                    context.Request.Method,
                    context.Request.Path,
                    context.HttpContext.Items["RequestId"] as string ?? "");
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

var ipGeoTimeout = builder.Configuration.GetValue("IpGeo:TimeoutSeconds", 2);
builder.Services.AddHttpClient<IpGeolocator>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(Math.Clamp(ipGeoTimeout, 1, 5));
    client.DefaultRequestHeaders.UserAgent.ParseAdd("DealerOps");
});

builder.Services.AddHostedService<AdminSeeder>();
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
        "ALTER TABLE app_user ADD COLUMN requested_dealer_id BIGINT NULL",
        "ALTER TABLE app_user ADD COLUMN google_sub VARCHAR(64) NULL",
        "ALTER TABLE app_user ADD COLUMN firebase_uid VARCHAR(128) NULL",
        "ALTER TABLE app_user ADD COLUMN given_name VARCHAR(120) NULL",
        "ALTER TABLE app_user ADD COLUMN family_name VARCHAR(120) NULL",
        "ALTER TABLE app_user ADD COLUMN avatar_url TEXT NULL",
        "ALTER TABLE app_user ADD COLUMN locale VARCHAR(16) NULL",
        // Existing members become sales; the owner and the platform admin promote afterwards.
        "ALTER TABLE membership ADD COLUMN dealer_role VARCHAR(16) NOT NULL DEFAULT 'SALES'",
        // ADD COLUMN cannot change the default of a column that is already there, so a database
        // created before the role rename still defaults to the old value DealerRole cannot parse.
        // SET DEFAULT is already idempotent.
        "ALTER TABLE membership ALTER COLUMN dealer_role SET DEFAULT 'SALES'",
        "ALTER TABLE audit_event ADD COLUMN previous_values JSON NULL",
        "ALTER TABLE audit_event ADD COLUMN client_ip VARCHAR(45) NULL",
        "ALTER TABLE audit_event ADD COLUMN client_location VARCHAR(255) NULL",
        "ALTER TABLE audit_event ADD COLUMN actor_display_name VARCHAR(120) NULL",
        "ALTER TABLE audit_event ADD COLUMN actor_role VARCHAR(16) NULL",
        "ALTER TABLE audit_event ADD COLUMN dealer_name VARCHAR(255) NULL",
        // Existing rows get the catch-all body type so the NOT NULL column needs no backfill;
        // the add-vehicle form chooses an explicit value for new rows.
        "ALTER TABLE vehicle ADD COLUMN body_type VARCHAR(16) NOT NULL DEFAULT 'other'",
        "ALTER TABLE vehicle ADD COLUMN mileage_km INT NULL",
        "ALTER TABLE vehicle ADD COLUMN exterior_color VARCHAR(40) NULL",
        "ALTER TABLE vehicle ADD COLUMN fuel_type VARCHAR(16) NULL",
        "ALTER TABLE vehicle ADD COLUMN stock_number VARCHAR(20) NULL",
        "ALTER TABLE vehicle ADD COLUMN list_price DECIMAL(12,2) NULL",
        "ALTER TABLE vehicle ADD COLUMN deleted_at DATETIME(6) NULL",
        "ALTER TABLE vehicle ADD COLUMN sold_by VARCHAR(64) NULL",
        "ALTER TABLE vehicle ADD COLUMN sold_to_name VARCHAR(120) NULL",
        "ALTER TABLE vehicle ADD COLUMN source_other VARCHAR(100) NULL",
        "ALTER TABLE vehicle ADD COLUMN acquired_from_name VARCHAR(120) NULL",
        "ALTER TABLE vehicle ADD COLUMN acquired_from_address VARCHAR(255) NULL",
        "ALTER TABLE customer ADD COLUMN deleted_at DATETIME(6) NULL",
        "ALTER TABLE dealer ADD COLUMN deleted_at DATETIME(6) NULL",
        "ALTER TABLE customer ADD COLUMN notes VARCHAR(2000) NULL",
        "ALTER TABLE listing ADD COLUMN prior_use VARCHAR(32) NULL",
        "ALTER TABLE listing ADD COLUMN warranty_terms TEXT NULL",
        "ALTER TABLE listing ADD COLUMN annual_km_allowance INT NULL",
    })
    {
        try { db.Database.ExecuteSqlRaw(patch); }
        // 1060: the column is already there.
        catch (MySqlException ex) when (ex.Number is 1060) { }
    }
    // The dealership role hierarchy gained a third tier: the old STAFF role is now SALES, and each
    // dealership keeps one owner. The promotion overrides whatever role a row holds, so it runs
    // once only: an administrator who unbinds an owner to bind a replacement would otherwise see
    // the earliest manager promoted again on the next start. The marker row records that.
    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS schema_patch (
            patch_id VARCHAR(64) PRIMARY KEY,
            applied_at DATETIME(6) NOT NULL
        )");
    using (var roleTx = db.Database.BeginTransaction())
    {
        // INSERT IGNORE claims the marker: 1 row means this database has not had the patch, 0 rows
        // means a previous start applied it. Every statement below shares this transaction, so a
        // transient failure rolls the marker back instead of leaving the data half migrated.
        var claimed = db.Database.ExecuteSqlRaw(
            "INSERT IGNORE INTO schema_patch (patch_id, applied_at) VALUES ({0}, UTC_TIMESTAMP(6))",
            "dealer_role_hierarchy_2026_11_03");
        if (claimed > 0)
        {
            // Canonicalise the stored spelling before the comparisons below. Rows written by the
            // app are upper case (EnumSnakeCaseConverter upper-cases every character) and the
            // committed seed files now hold upper case too, but rows written by an earlier build
            // or loaded from an older seed revision or dump may be lower case ('staff',
            // 'manager'). Normalising here, and comparing against UPPER(dealer_role) below, makes
            // the patch behave the same under a _ci, _cs or _bin collation instead of silently
            // flattening a lower-case 'manager' to SALES.
            db.Database.ExecuteSqlRaw("UPDATE membership SET dealer_role = UPPER(dealer_role)");
            // Any legacy spelling lands on SALES, including the old 'staff' and 'STAFF'.
            db.Database.ExecuteSqlRaw(
                "UPDATE membership SET dealer_role = 'SALES' WHERE UPPER(dealer_role) NOT IN ('OWNER','MANAGER','SALES')");
            // Each dealership keeps one owner: its earliest active manager (lowest created_at, then
            // lowest id) takes the new top tier. Dealerships that already have an active owner are
            // skipped. The derived tables are what lets MySQL read membership while updating it.
            db.Database.ExecuteSqlRaw(@"UPDATE membership
                JOIN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (PARTITION BY dealer_id ORDER BY created_at, id) AS rn
                        FROM membership
                        WHERE active = 1 AND UPPER(dealer_role) = 'MANAGER'
                          AND dealer_id NOT IN (
                              SELECT dealer_id FROM (
                                  SELECT DISTINCT dealer_id FROM membership
                                  WHERE active = 1 AND UPPER(dealer_role) = 'OWNER'
                              ) owned
                          )
                    ) ranked
                    WHERE ranked.rn = 1
                ) promote ON promote.id = membership.id
                SET membership.dealer_role = 'OWNER'");
            // A dealership whose members were all staff has nobody left who can open Team, approve
            // a join request or edit the profile once every row reads SALES, so only the platform
            // admin could rescue it. Its earliest active member becomes the owner. This runs after
            // the manager promotion, so a dealership that just gained an owner is already excluded;
            // a dealership with no active member at all matches no row and gets nobody.
            db.Database.ExecuteSqlRaw(@"UPDATE membership
                JOIN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (PARTITION BY dealer_id ORDER BY created_at, id) AS rn
                        FROM membership
                        WHERE active = 1
                          AND dealer_id NOT IN (
                              SELECT dealer_id FROM (
                                  SELECT DISTINCT dealer_id FROM membership
                                  WHERE active = 1 AND UPPER(dealer_role) IN ('OWNER','MANAGER')
                              ) administered
                          )
                    ) ranked
                    WHERE ranked.rn = 1
                ) promote ON promote.id = membership.id
                SET membership.dealer_role = 'OWNER'");
            // vehicle.sold_by was added today, so every earlier sale has it NULL and the sales
            // report's per-salesperson rows would not add up to the headline totals. The sale wrote
            // a VEHICLE/SELL audit row naming the acting user, which is the same value Sell now
            // stores, so the most recent such row per vehicle backfills it. Sold vehicles with no
            // SELL audit row keep NULL and stay out of the per-salesperson breakdown.
            db.Database.ExecuteSqlRaw(@"UPDATE vehicle
                JOIN (
                    SELECT entity_id, actor_username FROM (
                        SELECT entity_id, actor_username,
                               ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY created_at DESC, id DESC) AS rn
                        FROM audit_event
                        WHERE entity_type = 'VEHICLE' AND action = 'SELL' AND actor_username <> ''
                    ) ranked
                    WHERE ranked.rn = 1
                ) seller ON seller.entity_id = vehicle.id
                SET vehicle.sold_by = seller.actor_username
                WHERE vehicle.sold_by IS NULL AND vehicle.status = 'SOLD'");
        }
        roleTx.Commit();
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
            deleted_at DATETIME(6) NULL,
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
            deleted_at DATETIME(6) NULL,
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
        // No data is destroyed: deleting a photo, a payment or a customer-vehicle link sets
        // deleted_at and keeps the row.
        "ALTER TABLE vehicle_photo ADD COLUMN deleted_at DATETIME(6) NULL",
        "ALTER TABLE vehicle_payment ADD COLUMN deleted_at DATETIME(6) NULL",
        "ALTER TABLE customer_vehicle ADD COLUMN deleted_at DATETIME(6) NULL",
        // Unlinked rows stay, so the one-link-per-vehicle rule moves from vehicle_id to a column
        // that is NULL for unlinked rows. The plain index replaces the unique one fk_cv_vehicle uses.
        "ALTER TABLE customer_vehicle ADD COLUMN active_vehicle_id BIGINT GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN vehicle_id END) STORED",
        "ALTER TABLE customer_vehicle ADD UNIQUE KEY uk_cv_active_vehicle (active_vehicle_id)",
        "ALTER TABLE customer_vehicle ADD KEY idx_cv_vehicle (vehicle_id)",
        "ALTER TABLE customer_vehicle DROP INDEX uk_cv_vehicle",
        // Full names are no longer unique (CR D1).
        "ALTER TABLE app_user DROP INDEX uk_app_user_display_name",
    })
    {
        try { db.Database.ExecuteSqlRaw(ddl); }
        // 1061/1022/1826/1060: the index, foreign key or column already exists; 1091: the index
        // to drop is already gone.
        catch (MySqlException ex) when (ex.Number is 1061 or 1022 or 1826 or 1060 or 1091) { }
        // 1452/1138/1265: existing rows (an orphan or a NULL dealer_id) block the constraint.
        // Core still starts; the warning names the statement to repair by hand.
        catch (MySqlException ex) when (ex.Number is 1452 or 1138 or 1265)
        {
            app.Logger.LogWarning("Schema upgrade skipped, existing rows block it: {Ddl} ({Error})", ddl, ex.Message);
        }
    }
}

static ILogger PipelineLogger(HttpContext http) =>
    http.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("DealerOps.Core");

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
        var requestId = context.Items["RequestId"] as string ?? "";
        PipelineLogger(context).LogError(error,
            "Unhandled exception method={Method} path={Path} [{RequestId}]",
            context.Request.Method,
            context.Request.Path,
            requestId);
        if (context.Response.HasStarted) return;
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
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
