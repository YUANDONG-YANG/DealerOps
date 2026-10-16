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
        options.Filters.Add<ApiExceptionFilter>())
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

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var fieldErrors = new Dictionary<string, string>();
        foreach (var (key, entry) in context.ModelState)
        {
            if (entry.Errors.Count == 0) continue;
            var name = key.StartsWith("$.", StringComparison.Ordinal) ? key[2..] : key;
            if (name.Length == 0) name = "request";
            fieldErrors[ToCamelPath(name)] = entry.Errors[0].ErrorMessage;
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

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

builder.Services.AddSingleton<JwtService>();
// Singleton so Google's signing keys are fetched and cached once, not per sign-in.
builder.Services.AddSingleton<GoogleIdTokenVerifier>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<NewAccountRules>();
builder.Services.AddScoped<DealerAdminService>();
builder.Services.AddScoped<MembershipService>();
builder.Services.AddScoped<MemberDirectoryService>();
builder.Services.AddScoped<VehicleService>();
builder.Services.AddScoped<CustomerService>();
builder.Services.AddScoped<LeadService>();
builder.Services.AddScoped<WorkOrderService>();
builder.Services.AddScoped<ListingService>();
builder.Services.AddScoped<IAuditService, AuditService>();
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
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantMiddleware>();
app.MapControllers();
app.MapHealthChecks("/actuator/health");

ReleaseInfo.LogStartup(app.Services.GetRequiredService<ILogger<Program>>(), "core",
    ReleaseInfo.Resolve(builder.Configuration["PUBLISHED_AT"]));

app.Run();
