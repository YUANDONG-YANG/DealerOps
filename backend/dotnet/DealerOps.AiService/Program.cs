using System.Text.Json;
using System.Text.Json.Serialization;
using DealerOps.AiService.Adapter;
using DealerOps.AiService.Config;
using DealerOps.AiService.Middleware;
using DealerOps.AiService.Support;
using DealerOps.Logging;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddProvider(new FileLoggerProvider(
    Environment.GetEnvironmentVariable("LOG_DIR")
    ?? Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "../../../log-sum")),
    "ai-service"));

var port = builder.Configuration["AI_PORT"] ?? "8082";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddControllers(options => options.Filters.Add<AiExceptionFilter>())
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DealerOps AI Service API",
        Version = "v1",
        Description = "Internal AI endpoints used by DealerOps Core through the Gateway."
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the JWT access token returned by /api/v1/auth/login."
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

var connectMs = int.TryParse(
    builder.Configuration["AiService:ConnectTimeoutMs"], out var c) ? c : 2000;
var responseMs = int.TryParse(
    builder.Configuration["AiService:ResponseTimeoutMs"], out var r) ? r : 13000;

builder.Services.AddSingleton(new TimedModelCall(connectMs, responseMs));
// AI-02: the connect budget is enforced at the socket; TimedModelCall caps the whole call.
builder.Services.AddHttpClient("ai-provider")
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        ConnectTimeout = TimeSpan.FromMilliseconds(connectMs)
    });
builder.Services.AddSingleton<AiProviderClient>(sp =>
{
    var httpFactory = sp.GetRequiredService<IHttpClientFactory>();
    var config = sp.GetRequiredService<IConfiguration>();
    return new AiProviderClient(httpFactory.CreateClient("ai-provider"), config);
});
builder.Services.AddScoped<AdCheckAdapter>();
builder.Services.AddScoped<AssistantAdapter>();
builder.Services.AddSingleton<InternalGuardFilter>();
builder.Services.AddSingleton<AiExceptionFilter>();

var app = builder.Build();

// Credential check before Swagger so a direct browser cannot read the document.
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<InternalGuardFilter>();

// The Gateway is the only Swagger UI entry point; the JSON is always served for its aggregation.
app.UseSwagger();
app.MapControllers();

ReleaseInfo.LogStartup(app.Services.GetRequiredService<ILogger<Program>>(), "ai",
    ReleaseInfo.Resolve(builder.Configuration["PUBLISHED_AT"]));

app.Run();
