using System.Text.RegularExpressions;

namespace DealerOps.Core.Audit;

/// <summary>
/// Intra-city quadrant (NW, NE, SW, SE) from a geolocation result. A code is returned only when
/// the postal area or the district name sits in one quadrant. City alone produces nothing.
/// </summary>
internal static class CityQuadrant
{
    private static readonly Regex QuadrantWord = new(
        @"\b(NW|NE|SW|SE|Northwest|Northeast|Southwest|Southeast)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex CanadianPostal = new(
        @"^[A-Z]\d[A-Z]",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    /// <summary>Quadrant code, or null when the result does not identify one.</summary>
    public static string? Resolve(string? city, string? district, string? postalCode, string? region = null)
    {
        var key = CityKey(city);
        var fromArea = AreaInCity(key, region, district);
        if (fromArea == null && key == null)
            fromArea = AreaInCity(null, region, city);
        if (fromArea != null) return fromArea;

        var fromWord = key == null ? null : SingleQuadrant(district) ?? SingleQuadrant(city);
        if (fromWord != null) return fromWord;

        return FromPostal(key, city, region, postalCode);
    }

    /// <summary>Municipality implied by a mapped postal code, used when the lookup omitted the city.</summary>
    public static string? Municipality(string? postalCode)
    {
        var fsa = ForwardSortationArea(postalCode);
        if (fsa != null)
        {
            if (CalgaryFsa.ContainsKey(fsa)) return "Calgary";
            if (EdmontonFsa.ContainsKey(fsa)) return "Edmonton";
        }
        var zip = Zip5(postalCode);
        return zip != null && WashingtonZip.ContainsKey(zip) ? "Washington" : null;
    }

    private static string? FromPostal(string? cityKey, string? city, string? region, string? postalCode)
    {
        var fsa = ForwardSortationArea(postalCode);
        if (fsa != null && RegionAllowsAlberta(region))
        {
            if (CalgaryFsa.TryGetValue(fsa, out var calgary) && PostalCityOk(cityKey, city, "calgary", region))
                return calgary;
            if (EdmontonFsa.TryGetValue(fsa, out var edmonton) && PostalCityOk(cityKey, city, "edmonton", region))
                return edmonton;
        }

        var zip = Zip5(postalCode);
        if (zip != null && WashingtonZip.TryGetValue(zip, out var dc) && cityKey == "washington")
            return dc;
        if (zip != null && WashingtonZip.TryGetValue(zip, out dc) && cityKey == null
            && string.IsNullOrWhiteSpace(city) && (IsDc(region) || string.IsNullOrWhiteSpace(region)))
            return dc;
        return null;
    }

    /// <summary>
    /// The named municipality always matches. A blank city matches. Any other name matches only
    /// when it is one of that city's communities and the region agrees.
    /// </summary>
    private static bool PostalCityOk(string? cityKey, string? city, string expected, string? region)
    {
        if (cityKey == expected) return true;
        if (cityKey != null) return false;
        if (string.IsNullOrWhiteSpace(city)) return true;
        var name = Normalize(region);
        return name is "alberta" or "ab" && AreaQuadrant(expected, city) != null;
    }

    /// <summary>A stated non-Alberta region blocks an Alberta postal quadrant. A blank region does not.</summary>
    private static bool RegionAllowsAlberta(string? region)
    {
        var name = Normalize(region);
        return name.Length == 0 || name is "alberta" or "ab";
    }

    /// <summary>
    /// District names apply to Calgary or Edmonton only. Another city's name is never rewritten
    /// as one of their neighborhoods unless the region is Alberta.
    /// </summary>
    private static string? AreaInCity(string? cityKey, string? region, string? area)
    {
        if (cityKey != null) return AreaQuadrant(cityKey, area);
        if (!RegionAllowsAlberta(region) || string.IsNullOrWhiteSpace(region)) return null;
        var calgary = AreaQuadrant("calgary", area);
        var edmonton = AreaQuadrant("edmonton", area);
        if (calgary != null && edmonton != null) return calgary == edmonton ? calgary : null;
        return calgary ?? edmonton;
    }

    private static bool IsDc(string? region)
    {
        var name = Normalize(region);
        return name is "district of columbia" or "dc" or "washington dc" or "washington d c";
    }

    private static string? CityKey(string? city)
    {
        var name = Normalize(city);
        if (name.Length == 0) return null;
        if (name is "calgary" || name.StartsWith("calgary ", StringComparison.Ordinal)) return "calgary";
        if (name is "edmonton" || name.StartsWith("edmonton ", StringComparison.Ordinal)) return "edmonton";
        if (name is "washington" || name.StartsWith("washington ", StringComparison.Ordinal)) return "washington";
        return null;
    }

    private static string? AreaQuadrant(string cityKey, string? area)
    {
        var name = Normalize(area);
        if (name.Length == 0 || name == cityKey) return null;
        var areas = cityKey switch
        {
            "calgary" => CalgaryArea,
            "edmonton" => EdmontonArea,
            _ => null
        };
        if (areas == null) return null;
        if (areas.TryGetValue(name, out var exact)) return exact;

        string? found = null;
        foreach (var pair in areas.OrderByDescending(pair => pair.Key.Length))
        {
            if (!ContainsPhrase(name, pair.Key) || !OnlyDirectionalExtras(name, pair.Key)) continue;
            if (found != null && found != pair.Value) return null;
            found = pair.Value;
        }
        return found;
    }

    private static bool ContainsPhrase(string text, string phrase)
    {
        var at = text.IndexOf(phrase, StringComparison.Ordinal);
        while (at >= 0)
        {
            var before = at == 0 || text[at - 1] == ' ';
            var end = at + phrase.Length;
            var after = end == text.Length || text[end] == ' ';
            if (before && after) return true;
            at = text.IndexOf(phrase, at + 1, StringComparison.Ordinal);
        }
        return false;
    }

    /// <summary>
    /// "West Mill Woods" may extend "Mill Woods". A second place name in the same string may not.
    /// </summary>
    private static bool OnlyDirectionalExtras(string text, string phrase)
    {
        var rest = text.Replace(phrase, " ", StringComparison.Ordinal);
        foreach (var word in rest.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            if (word is not ("north" or "south" or "east" or "west" or "central" or "the" or "inner" or "outer"))
                return false;
        }
        return true;
    }

    private static string? SingleQuadrant(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        string? found = null;
        foreach (Match match in QuadrantWord.Matches(text))
        {
            var code = WordToCode(match.Value);
            if (found != null && found != code) return null;
            found = code;
        }
        return found;
    }

    private static string WordToCode(string word) => word.ToLowerInvariant() switch
    {
        "nw" or "northwest" => "NW",
        "ne" or "northeast" => "NE",
        "sw" or "southwest" => "SW",
        "se" or "southeast" => "SE",
        _ => ""
    };

    private static string? ForwardSortationArea(string? postalCode)
    {
        if (string.IsNullOrWhiteSpace(postalCode)) return null;
        var compact = postalCode.Trim().Replace(" ", "", StringComparison.Ordinal).ToUpperInvariant();
        if (compact.Length < 3 || !CanadianPostal.IsMatch(compact)) return null;
        return compact[..3];
    }

    private static string? Zip5(string? postalCode)
    {
        if (string.IsNullOrWhiteSpace(postalCode)) return null;
        if (ForwardSortationArea(postalCode) != null) return null;
        var digits = new string(postalCode.Where(char.IsDigit).ToArray());
        return digits.Length >= 5 ? digits[..5] : null;
    }

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        var chars = value.Trim().ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) ? c : ' ').ToArray();
        var collapsed = string.Join(' ', new string(chars).Split(' ', StringSplitOptions.RemoveEmptyEntries));
        const string prefix = "city of ";
        return collapsed.StartsWith(prefix, StringComparison.Ordinal) ? collapsed[prefix.Length..] : collapsed;
    }

    // Calgary FSAs whose Canada Post communities all sit in one City of Calgary quadrant.
    // T2G is omitted: Chinatown meets Inglewood and East Victoria Park across Centre Street.
    private static readonly Dictionary<string, string> CalgaryFsa = new(StringComparer.Ordinal)
    {
        ["T1Y"] = "NE", ["T2A"] = "NE", ["T2E"] = "NE", ["T3J"] = "NE", ["T3N"] = "NE",
        ["T2K"] = "NW", ["T2L"] = "NW", ["T2M"] = "NW", ["T2N"] = "NW", ["T3A"] = "NW",
        ["T3B"] = "NW", ["T3G"] = "NW", ["T3K"] = "NW", ["T3L"] = "NW", ["T3P"] = "NW", ["T3R"] = "NW",
        ["T2P"] = "SW", ["T2R"] = "SW", ["T2S"] = "SW", ["T2T"] = "SW", ["T2V"] = "SW",
        ["T2W"] = "SW", ["T2Y"] = "SW", ["T3C"] = "SW", ["T3E"] = "SW", ["T3H"] = "SW",
        ["T2B"] = "SE", ["T2C"] = "SE", ["T2H"] = "SE", ["T2J"] = "SE", ["T2X"] = "SE",
        ["T2Z"] = "SE", ["T3M"] = "SE", ["T3S"] = "SE",
    };

    // Edmonton FSAs that sit in one geographic sector. North-sector and west-sector codes
    // (Castle Downs, Jasper Place) are omitted because they are not a single NW/NE/SW/SE.
    // Northeast communities share FSAs with other sectors, so they are named below instead.
    private static readonly Dictionary<string, string> EdmontonFsa = new(StringComparer.Ordinal)
    {
        ["T5S"] = "NW",
        ["T6J"] = "SW", ["T6M"] = "SW", ["T6R"] = "SW", ["T6W"] = "SW",
        ["T6K"] = "SE", ["T6L"] = "SE", ["T6N"] = "SE", ["T6P"] = "SE",
        ["T6T"] = "SE", ["T6X"] = "SE", ["T6Y"] = "SE",
    };

    // District of Columbia ZIPs that lie in one quadrant. ZIPs that cross a quadrant are omitted.
    private static readonly Dictionary<string, string> WashingtonZip = new(StringComparer.Ordinal)
    {
        ["20005"] = "NW", ["20006"] = "NW", ["20007"] = "NW", ["20008"] = "NW",
        ["20009"] = "NW", ["20010"] = "NW", ["20011"] = "NW", ["20012"] = "NW",
        ["20015"] = "NW", ["20016"] = "NW", ["20036"] = "NW", ["20037"] = "NW",
        ["20017"] = "NE", ["20018"] = "NE", ["20019"] = "NE",
        ["20020"] = "SE", ["20032"] = "SE",
        ["20024"] = "SW",
    };

    private static readonly Dictionary<string, string> CalgaryArea = new(StringComparer.Ordinal)
    {
        ["rundle"] = "NE", ["whitehorn"] = "NE", ["monterey park"] = "NE",
        ["penbrooke meadows"] = "NE", ["marlborough"] = "NE", ["bridgeland"] = "NE",
        ["greenview"] = "NE", ["martindale"] = "NE", ["taradale"] = "NE",
        ["falconridge"] = "NE", ["saddle ridge"] = "NE",
        ["thorncliffe"] = "NW", ["tuxedo park"] = "NW", ["brentwood"] = "NW",
        ["collingwood"] = "NW", ["nose hill"] = "NW", ["mount pleasant"] = "NW",
        ["capitol hill"] = "NW", ["banff trail"] = "NW", ["kensington"] = "NW",
        ["westmont"] = "NW", ["parkdale"] = "NW", ["dalhousie"] = "NW",
        ["edgemont"] = "NW", ["hamptons"] = "NW", ["hidden valley"] = "NW",
        ["montgomery"] = "NW", ["bowness"] = "NW", ["silver springs"] = "NW",
        ["greenwood"] = "NW", ["hawkwood"] = "NW", ["arbour lake"] = "NW",
        ["citadel"] = "NW", ["ranchlands"] = "NW", ["royal oak"] = "NW",
        ["rocky ridge"] = "NW", ["sandstone"] = "NW", ["macewan glen"] = "NW",
        ["beddington"] = "NW", ["harvest hills"] = "NW", ["coventry hills"] = "NW",
        ["panorama hills"] = "NW", ["tuscany"] = "NW", ["scenic acres"] = "NW",
        ["symons valley"] = "NW",
        ["connaught"] = "SW", ["west victoria park"] = "SW", ["elbow park"] = "SW",
        ["britannia"] = "SW", ["parkhill"] = "SW", ["mission"] = "SW",
        ["altadore"] = "SW", ["bankview"] = "SW", ["richmond"] = "SW",
        ["oakridge"] = "SW", ["haysboro"] = "SW", ["kingsland"] = "SW",
        ["kelvin grove"] = "SW", ["windsor park"] = "SW", ["braeside"] = "SW",
        ["cedarbrae"] = "SW", ["woodbine"] = "SW", ["millrise"] = "SW",
        ["somerset"] = "SW", ["bridlewood"] = "SW", ["evergreen"] = "SW",
        ["rosscarrock"] = "SW", ["westgate"] = "SW", ["wildwood"] = "SW",
        ["shaganappi"] = "SW", ["sunalta"] = "SW", ["lakeview"] = "SW",
        ["glendale"] = "SW", ["killarney"] = "SW", ["glamorgan"] = "SW",
        ["discovery ridge"] = "SW", ["signal hill"] = "SW", ["west springs"] = "SW",
        ["christie park"] = "SW", ["patterson"] = "SW", ["cougar ridge"] = "SW",
        ["forest lawn"] = "SE", ["dover"] = "SE", ["erin woods"] = "SE",
        ["lynnwood ridge"] = "SE", ["ogden"] = "SE", ["foothills industrial"] = "SE",
        ["great plains"] = "SE", ["highfield"] = "SE", ["burns industrial"] = "SE",
        ["queensland"] = "SE", ["lake bonavista"] = "SE", ["willow park"] = "SE",
        ["acadia"] = "SE", ["midnapore"] = "SE", ["sundance"] = "SE",
        ["douglas glen"] = "SE", ["mckenzie lake"] = "SE", ["copperfield"] = "SE",
        ["east shepard"] = "SE",         ["cranston"] = "SE", ["auburn bay"] = "SE",
        ["mahogany"] = "SE", ["inglewood"] = "SE",
    };

    private static readonly Dictionary<string, string> EdmontonArea = new(StringComparer.Ordinal)
    {
        ["clareview"] = "NE", ["hermitage"] = "NE", ["horse hill"] = "NE", ["pilot sound"] = "NE",
        ["winterburn"] = "NW", ["big lake"] = "NW", ["westview village"] = "NW",
        ["kaskitayo"] = "SW", ["aspen gardens"] = "SW", ["riverbend"] = "SW",
        ["terwillegar"] = "SW", ["terwillegar heights"] = "SW", ["windermere"] = "SW",
        ["heritage valley"] = "SW", ["blackburne"] = "SW",
        ["mill woods"] = "SE", ["west mill woods"] = "SE", ["east mill woods"] = "SE",
        ["ellerslie"] = "SE", ["summerside"] = "SE", ["the meadows"] = "SE",
        ["decoteau"] = "SE", ["south edmonton common"] = "SE",
    };
}
