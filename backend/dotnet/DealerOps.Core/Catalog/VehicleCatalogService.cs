using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using DealerOps.Core.Common.Exceptions;
using Microsoft.Extensions.Caching.Memory;

namespace DealerOps.Core.Catalog;

public class VehicleCatalogService
{
    private static readonly string[] MakeVehicleTypes = ["car", "mpv"];
    private static readonly Regex VinPattern = new("^[A-HJ-NPR-Z0-9]{17}$", RegexOptions.Compiled);

    // vPIC reference data changes rarely, so a long window keeps the anonymous landing page off the network.
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(12);

    private const string MakesCacheKey = "catalog:makes";

    // The service itself stays transient because it holds a typed HttpClient; the cache is the
    // injected singleton, so entries survive across requests without making the handler captive.
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;

    public VehicleCatalogService(HttpClient httpClient, IMemoryCache cache)
    {
        _httpClient = httpClient;
        _cache = cache;
    }

    public async Task<List<string>> MakesAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(MakesCacheKey, out List<string>? cached) && cached is not null)
            return cached;

        var allMakes = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var type in MakeVehicleTypes)
        {
            var results = await FetchResultsAsync($"GetMakesForVehicleType/{type}?format=json", cancellationToken);
            foreach (var r in results)
            {
                var name = Text(r, "MakeName");
                if (name is not null) allMakes.Add(name);
            }
        }

        var makes = allMakes.ToList();
        _cache.Set(MakesCacheKey, makes, CacheDuration);
        return makes;
    }

    public async Task<List<string>> ModelsAsync(string? make, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(make))
            throw new ApiException(ErrorCode.Validation, "Make is required.");

        var key = make.Trim().ToUpperInvariant();
        var cacheKey = $"catalog:models:{key}";
        if (!_cache.TryGetValue(cacheKey, out List<string>? models) || models is null)
        {
            var sorted = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
            var results = await FetchResultsAsync(
                $"GetModelsForMake/{Uri.EscapeDataString(key)}?format=json", cancellationToken);
            foreach (var r in results)
            {
                var name = Text(r, "Model_Name");
                if (name is not null) sorted.Add(name);
            }

            // The empty result is cached as well, so an unknown make cannot be replayed against
            // vPIC through this anonymous endpoint.
            models = sorted.ToList();
            _cache.Set(cacheKey, models, CacheDuration);
        }

        // vPIC answers an unknown make with an empty result set, so an empty list is reported as
        // NOT_FOUND instead of a silent 200 [].
        if (models.Count == 0)
            throw new ApiException(ErrorCode.NotFound, "No models found for this make.");

        return models;
    }

    public async Task<VinDecodeResponse> DecodeVinAsync(string? vin, CancellationToken cancellationToken)
    {
        var key = vin?.Trim().ToUpperInvariant() ?? "";
        if (!VinPattern.IsMatch(key))
            throw new ApiException(ErrorCode.Validation, "VIN must be 17 characters without I, O, or Q.");

        var cacheKey = $"catalog:vin:{key}";
        if (_cache.TryGetValue(cacheKey, out VinDecodeResponse? cached) && cached is not null)
            return cached;

        var results = await FetchResultsAsync($"DecodeVinValues/{key}?format=json", cancellationToken);
        if (results.Count == 0)
            throw new ApiException(ErrorCode.CatalogUnavailable, "Vehicle catalog is unavailable.");

        var r = results[0];
        var makeName = Text(r, "Make");
        if (makeName is null)
            throw new ApiException(ErrorCode.NotFound, "No vehicle found for this VIN.");

        var engineParts = new List<string>();
        var litres = Text(r, "DisplacementL");
        if (litres is not null
            && decimal.TryParse(litres, NumberStyles.Number, CultureInfo.InvariantCulture, out var displacement))
            engineParts.Add(displacement.ToString("F1", CultureInfo.InvariantCulture) + "L");

        var cylinders = Text(r, "EngineCylinders");
        if (cylinders is not null) engineParts.Add(cylinders + "-cyl");

        var fuelType = Text(r, "FuelTypePrimary");
        if (fuelType is not null) engineParts.Add(fuelType);

        int? modelYear = null;
        var yearStr = Text(r, "ModelYear");
        if (yearStr is not null
            && int.TryParse(yearStr, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedYear))
            modelYear = parsedYear;

        var decoded = new VinDecodeResponse(
            key, makeName, Text(r, "Model") ?? "",
            modelYear,
            Text(r, "BodyClass"),
            engineParts.Count > 0 ? string.Join(" ", engineParts) : null,
            Text(r, "PlantCountry"), Text(r, "Manufacturer"));

        _cache.Set(cacheKey, decoded, CacheDuration);
        return decoded;
    }

    private async Task<List<JsonElement>> FetchResultsAsync(string uri, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _httpClient.GetAsync(uri, cancellationToken);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("Results", out var arr) && arr.ValueKind == JsonValueKind.Array)
                return arr.EnumerateArray().ToList();
        }
        catch (Exception ex) when (ex is not ApiException)
        {
            throw new ApiException(ErrorCode.CatalogUnavailable, "Vehicle catalog is unavailable.");
        }
        throw new ApiException(ErrorCode.CatalogUnavailable, "Vehicle catalog is unavailable.");
    }

    private static string? Text(JsonElement r, string field)
    {
        if (!r.TryGetProperty(field, out var prop)) return null;
        var val = prop.GetString()?.Trim();
        return string.IsNullOrEmpty(val) ? null : val;
    }
}
