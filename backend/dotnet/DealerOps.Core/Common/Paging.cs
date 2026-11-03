using System.Linq.Expressions;
using DealerOps.Core.Common.Exceptions;

namespace DealerOps.Core.Common;

public static class Paging
{
    public static int ClampPage(int page) => Math.Max(0, page);

    public static int ClampSize(int size) => size <= 0 ? 10 : Math.Min(size, 100);

    /// <summary>
    /// Parses a list's optional <c>sort=field,asc|desc</c> parameter against the fields the list allows;
    /// null when absent. An unknown field or direction fails with VALIDATION on <c>sort</c>.
    /// </summary>
    public static (string Field, bool Descending)? ParseSort(string? sort, IReadOnlyCollection<string> fields)
    {
        if (string.IsNullOrWhiteSpace(sort)) return null;
        var parts = sort.Split(',', StringSplitOptions.TrimEntries);
        var dir = parts.Length == 2 ? parts[1].ToLowerInvariant() : "asc";
        if (parts.Length > 2 || !fields.Contains(parts[0]) || (dir != "asc" && dir != "desc"))
            throw new ApiException(ErrorCode.Validation, "Request is invalid.",
                new Dictionary<string, string> { ["sort"] = $"Use one of {string.Join(", ", fields)} with asc or desc" });
        return (parts[0], dir == "desc");
    }

    /// <summary>Orders by the key ascending or descending.</summary>
    public static IOrderedQueryable<T> OrderByDirection<T, TKey>(
        this IQueryable<T> query, Expression<Func<T, TKey>> key, bool descending) =>
        descending ? query.OrderByDescending(key) : query.OrderBy(key);
}
