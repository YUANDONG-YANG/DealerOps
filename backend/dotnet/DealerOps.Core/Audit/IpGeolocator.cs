using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace DealerOps.Core.Audit;

/// <summary>
/// Resolves a client IP to a place name once, when an audit row is written. The free
/// ip-api.com JSON shape is the supported response: country, regionName, city, district, zip.
/// A blank base URL disables the network call. Private addresses are labeled locally.
/// </summary>
public class IpGeolocator
{
    private static readonly TimeSpan CacheFor = TimeSpan.FromHours(6);

    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<IpGeolocator> _logger;
    private readonly string? _baseUrl;
    private readonly string? _apiKey;

    public IpGeolocator(HttpClient http, IConfiguration config, IMemoryCache cache, ILogger<IpGeolocator> logger)
    {
        _http = http;
        _cache = cache;
        _logger = logger;
        var baseUrl = config["IpGeo:BaseUrl"]?.Trim().TrimEnd('/');
        _baseUrl = string.IsNullOrWhiteSpace(baseUrl) ? null : baseUrl;
        var apiKey = config["IpGeo:ApiKey"]?.Trim();
        _apiKey = string.IsNullOrWhiteSpace(apiKey) ? null : apiKey;
    }

    /// <summary>
    /// Place text for an audit row, the local-network label, or null when the address is public
    /// but the lookup is unconfigured or failed. Never throws.
    /// </summary>
    public string? Describe(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip)) return null;
        if (IpAddressPrivacy.IsNonRoutable(ip)) return IpAddressPrivacy.LocalLabel;
        var routable = IpAddressPrivacy.RoutableAddress(ip);
        if (routable == null || _baseUrl == null) return null;

        if (_cache.TryGetValue(CacheKey(routable), out string? cached))
            return cached;

        try
        {
            var place = Lookup(routable);
            if (place != null)
                _cache.Set(CacheKey(routable), place, CacheFor);
            return place;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                "IP geolocation lookup failed errorType={ErrorType}", ex.GetType().Name);
            return null;
        }
    }

    private string? Lookup(string ip)
    {
        var url = $"{_baseUrl}/json/{Uri.EscapeDataString(ip)}?fields=status,country,regionName,city,district,zip&lang=en";
        if (_apiKey != null)
            url += "&key=" + Uri.EscapeDataString(_apiKey);

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        using var response = _http.Send(request);
        if (!response.IsSuccessStatusCode) return null;

        using var body = response.Content.ReadAsStream();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        if (!string.Equals(Text(root, "status"), "success", StringComparison.OrdinalIgnoreCase))
            return null;

        var country = Text(root, "country");
        var region = Text(root, "regionName");
        var city = Text(root, "city");
        var district = Text(root, "district");
        var postal = Text(root, "zip");
        var quadrant = CityQuadrant.Resolve(city, district, postal, region);
        if (string.IsNullOrWhiteSpace(city))
            city = CityQuadrant.Municipality(postal);
        return AuditPlace.Format(district, city, quadrant, region, country);
    }

    private static string CacheKey(string ip) => "ipgeo:" + ip;

    private static string? Text(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.String)
            return null;
        var text = value.GetString()?.Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }
}

/// <summary>One readable place line. The quadrant is attached to the city and kept with the row.</summary>
internal static class AuditPlace
{
    public static string? Format(string? district, string? city, string? quadrant, string? region, string? country)
    {
        var parts = new List<string>();
        Add(parts, Neighborhood(district, city, quadrant));
        Add(parts, CityLine(city, quadrant));
        Add(parts, region);
        Add(parts, country);
        if (parts.Count == 0) return null;
        var text = string.Join(", ", parts);
        return text.Length <= 255 ? text : text[..255];
    }

    private static string? CityLine(string? city, string? quadrant)
    {
        if (string.IsNullOrWhiteSpace(city))
            return string.IsNullOrWhiteSpace(quadrant) ? null : quadrant;
        return string.IsNullOrWhiteSpace(quadrant) ? city.Trim() : $"{city.Trim()} {quadrant}";
    }

    /// <summary>Keeps a neighborhood. Drops a district that only repeats the city or the quadrant.</summary>
    private static string? Neighborhood(string? district, string? city, string? quadrant)
    {
        if (string.IsNullOrWhiteSpace(district)) return null;
        var trimmed = district.Trim();
        if (Same(trimmed, city)) return null;
        var words = Words(trimmed);
        var skip = new HashSet<string>(Words(city), StringComparer.Ordinal);
        foreach (var word in QuadrantWords(quadrant)) skip.Add(word);
        skip.Add("city");
        skip.Add("of");
        return words.Any(word => !skip.Contains(word)) ? trimmed : null;
    }

    private static IEnumerable<string> QuadrantWords(string? quadrant) => quadrant switch
    {
        "NW" => ["nw", "northwest"],
        "NE" => ["ne", "northeast"],
        "SW" => ["sw", "southwest"],
        "SE" => ["se", "southeast"],
        _ => []
    };

    private static List<string> Words(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return [];
        return value.ToLowerInvariant()
            .Split([' ', ',', '/', '-'], StringSplitOptions.RemoveEmptyEntries)
            .Select(word => new string(word.Where(char.IsLetterOrDigit).ToArray()))
            .Where(word => word.Length > 0)
            .ToList();
    }

    private static void Add(List<string> parts, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        var trimmed = value.Trim();
        if (parts.Any(part => Same(part, trimmed) || Same(CityOf(part), trimmed))) return;
        parts.Add(trimmed);
    }

    private static string CityOf(string cityLine)
    {
        var space = cityLine.LastIndexOf(' ');
        if (space <= 0) return cityLine;
        var tail = cityLine[(space + 1)..];
        return tail is "NW" or "NE" or "SW" or "SE" ? cityLine[..space] : cityLine;
    }

    private static bool Same(string? left, string? right) =>
        string.Equals(left?.Trim(), right?.Trim(), StringComparison.OrdinalIgnoreCase);
}
