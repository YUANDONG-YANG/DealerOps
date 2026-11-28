using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace DealerOps.Logging;

/// <summary>
/// Validates the <c>X-Request-ID</c> a caller sends before a service echoes it into logs and
/// response headers, so a crafted header cannot inject log lines or arbitrary header text.
/// </summary>
public static partial class RequestId
{
    /// <summary>The header that carries the request id between the browser and the services.</summary>
    public const string Header = "X-Request-ID";

    /// <summary>Returns true when the value is 1 to 64 characters of letters, digits, dot, underscore or hyphen.</summary>
    public static bool IsValid([NotNullWhen(true)] string? value) => value is not null && SafePattern().IsMatch(value);

    [GeneratedRegex(@"^[A-Za-z0-9._-]{1,64}\z")]
    private static partial Regex SafePattern();
}
