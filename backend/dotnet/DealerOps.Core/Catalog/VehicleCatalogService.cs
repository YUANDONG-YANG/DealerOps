using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Catalog;

public class VehicleCatalogService
{
    private static readonly string[] MakeVehicleTypes = ["car", "mpv"];
    private static readonly Regex VinPattern = new("^[A-HJ-NPR-Z0-9]{17}$", RegexOptions.Compiled);

    private readonly HttpClient _httpClient;
    private readonly ConcurrentDictionary<string, List<string>> _cache = new();
    private readonly ConcurrentDictionary<string, VinDecodeResponse> _vinCache = new();

    public VehicleCatalogService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public List<string> Makes()
    {
        TenantGuard.RequireDealerUser();
        return _cache.GetOrAdd("makes", _ =>
        {
            var allMakes = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var type in MakeVehicleTypes)
            {
                var results = FetchResults($"/GetMakesForVehicleType/{type}?format=json");
                foreach (var r in results)
                {
                    var name = r.GetProperty("MakeName").GetString()?.Trim();
                    if (!string.IsNullOrEmpty(name)) allMakes.Add(name);
                }
            }
            return allMakes.ToList();
        });
    }

    public List<string> Models(string? make)
    {
        TenantGuard.RequireDealerUser();
        if (string.IsNullOrWhiteSpace(make))
            throw new ApiException(ErrorCode.Validation, "Make is required.");

        var key = make.Trim().ToUpperInvariant();
        return _cache.GetOrAdd($"models:{key}", _ =>
        {
            var sorted = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var r in FetchResults($"/GetModelsForMake/{key}?format=json"))
            {
                var name = r.GetProperty("Model_Name").GetString()?.Trim();
                if (!string.IsNullOrEmpty(name)) sorted.Add(name);
            }
            return sorted.ToList();
        });
    }

    public VinDecodeResponse DecodeVin(string vin)
    {
        var key = vin?.Trim().ToUpperInvariant() ?? "";
        if (!VinPattern.IsMatch(key))
            throw new ApiException(ErrorCode.Validation, "VIN must be 17 characters without I, O, or Q.");

        if (_vinCache.TryGetValue(key, out var cached)) return cached;

        var results = FetchResults($"/DecodeVinValues/{key}?format=json");
        if (results.Count == 0)
            throw new ApiException(ErrorCode.CatalogUnavailable, "Vehicle catalog is unavailable.");

        var r = results[0];
        var makeName = Text(r, "Make");
        if (makeName == null)
            throw new ApiException(ErrorCode.NotFound, "No vehicle found for this VIN.");

        var yearStr = Text(r, "ModelYear");
        var litres = Text(r, "DisplacementL");
        var cylinders = Text(r, "EngineCylinders");
        var fuelType = Text(r, "FuelTypePrimary");

        var engineParts = new List<string>();
        if (litres != null) engineParts.Add(decimal.Parse(litres).ToString("F1") + "L");
        if (cylinders != null) engineParts.Add(cylinders + "-cyl");
        if (fuelType != null) engineParts.Add(fuelType);
        var engine = engineParts.Count > 0 ? string.Join(" ", engineParts) : null;

        var decoded = new VinDecodeResponse(
            key, makeName, Text(r, "Model") ?? "",
            yearStr != null ? int.Parse(yearStr) : null,
            Text(r, "BodyClass"), engine,
            Text(r, "PlantCountry"), Text(r, "Manufacturer"));

        _vinCache.TryAdd(key, decoded);
        return decoded;
    }

    private List<JsonElement> FetchResults(string uri)
    {
        try
        {
            var response = _httpClient.GetAsync(uri).GetAwaiter().GetResult();
            response.EnsureSuccessStatusCode();
            var body = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
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
