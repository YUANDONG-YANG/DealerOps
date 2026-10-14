using System.Text.Json;
using System.Text.Json.Serialization;
using DealerOps.AiService.Adapter;
using DealerOps.AiService.Config;
using DealerOps.AiService.Middleware;
using DealerOps.AiService.Support;

var builder = WebApplication.CreateBuilder(args);

var port = builder.Configuration["AI_PORT"] ?? "8082";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddControllers(options => options.Filters.Add<AiExceptionFilter>())
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

var connectMs = int.TryParse(
    builder.Configuration["AiService:ConnectTimeoutMs"], out var c) ? c : 2000;
var responseMs = int.TryParse(
    builder.Configuration["AiService:ResponseTimeoutMs"], out var r) ? r : 13000;

builder.Services.AddSingleton(new TimedModelCall(connectMs, responseMs));
builder.Services.AddHttpClient("ai-provider");
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

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<InternalGuardFilter>();
app.MapControllers();

app.Run();
