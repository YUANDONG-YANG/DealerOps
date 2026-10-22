using System.Text;

namespace DealerOps.Core.Dealer;

/// <summary>
/// The buyer-site URL name of a dealership (<c>/shop/{slug}</c>), derived from its legal name so no
/// column is stored. Renaming a dealership changes its slug; the numeric id still resolves.
/// </summary>
public static class DealerSlug
{
    /// <summary>
    /// Assigns every given dealership a unique slug. When several share a name, the oldest (lowest id)
    /// keeps the plain name and each later one gets <c>-{id}</c>. A name with no letters or digits
    /// becomes <c>dealer-{id}</c>.
    /// </summary>
    public static Dictionary<long, string> Assign(IEnumerable<(long Id, string LegalName)> dealers)
    {
        var slugs = new Dictionary<long, string>();
        var taken = new HashSet<string>();
        foreach (var (id, legalName) in dealers.OrderBy(d => d.Id))
        {
            var slug = Of(legalName);
            if (slug.Length == 0) slug = $"dealer-{id}";
            else if (!taken.Add(slug)) slug = $"{slug}-{id}";
            taken.Add(slug);
            slugs[id] = slug;
        }
        return slugs;
    }

    // Lowercase letters and digits (any script) joined by single hyphens: "Prairie Auto Ltd." → "prairie-auto-ltd".
    private static string Of(string legalName)
    {
        var sb = new StringBuilder();
        foreach (var ch in legalName.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }
        return sb.ToString().TrimEnd('-');
    }
}
