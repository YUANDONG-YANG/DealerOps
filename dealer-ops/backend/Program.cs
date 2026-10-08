using System.Net.Http.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient("Nhtsa", client =>
{
    client.BaseAddress = new Uri("https://vpic.nhtsa.dot.gov/api/");
    client.Timeout = TimeSpan.FromSeconds(15);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("Frontend");

app.MapGet("/api/health", () => Results.Ok(new
{
    service = "Dealer Ops API",
    status = "ok",
    language = "C# / ASP.NET Core"
}));

app.MapGet("/api/vin/{vin}", async (
    string vin,
    IHttpClientFactory httpClientFactory,
    CancellationToken cancellationToken) =>
{
    var cleanVin = vin.Trim().ToUpperInvariant();

    if (cleanVin.Length != 17)
    {
        return Results.BadRequest(new { message = "VIN must contain exactly 17 characters." });
    }

    var client = httpClientFactory.CreateClient("Nhtsa");

    try
    {
        var response = await client.GetFromJsonAsync<NhtsaResponse>(
            $"vehicles/DecodeVinValuesExtended/{Uri.EscapeDataString(cleanVin)}?format=json",
            cancellationToken);

        var values = response?.Results?.FirstOrDefault();

        if (values is null)
        {
            return Results.NotFound(new { message = "No vehicle information was returned for this VIN." });
        }

        return Results.Ok(new
        {
            vin = cleanVin,
            make = Clean(values.Make),
            model = Clean(values.Model),
            year = Clean(values.ModelYear),
            bodyClass = Clean(values.BodyClass),
            engineModel = Clean(values.EngineModel),
            displacementL = Clean(values.DisplacementL),
            country = Clean(values.PlantCountry),
            manufacturer = Clean(values.Manufacturer)
        });
    }
    catch (OperationCanceledException)
    {
        return Results.Problem(
            title: "VIN lookup timed out",
            detail: "The vehicle information service did not respond in time.",
            statusCode: StatusCodes.Status504GatewayTimeout);
    }
    catch (Exception)
    {
        return Results.Problem(
            title: "VIN lookup failed",
            detail: "The external vehicle information service could not be reached.",
            statusCode: StatusCodes.Status502BadGateway);
    }
});

app.Run();

static string? Clean(string? value)
{
    if (string.IsNullOrWhiteSpace(value) || value.Equals("Not Applicable", StringComparison.OrdinalIgnoreCase))
        return null;

    return value.Trim();
}

public sealed class NhtsaResponse
{
    [JsonPropertyName("Results")]
    public List<NhtsaVehicle> Results { get; set; } = new();
}

public sealed class NhtsaVehicle
{
    [JsonPropertyName("Make")]
    public string? Make { get; set; }

    [JsonPropertyName("Model")]
    public string? Model { get; set; }

    [JsonPropertyName("ModelYear")]
    public string? ModelYear { get; set; }

    [JsonPropertyName("BodyClass")]
    public string? BodyClass { get; set; }

    [JsonPropertyName("EngineModel")]
    public string? EngineModel { get; set; }

    [JsonPropertyName("DisplacementL")]
    public string? DisplacementL { get; set; }

    [JsonPropertyName("PlantCountry")]
    public string? PlantCountry { get; set; }

    [JsonPropertyName("Manufacturer")]
    public string? Manufacturer { get; set; }
}
