using System.Reflection;
using Microsoft.Extensions.Logging;

namespace DealerOps.Logging;

/// <summary>Release time reported by each service's <c>/actuator/release</c> and startup log.</summary>
public static class ReleaseInfo
{
    /// <summary>
    /// Returns <c>PUBLISHED_AT</c> when deployments set it; otherwise the entry assembly's build time.
    /// </summary>
    public static string Resolve(string? publishedAt)
    {
        if (!string.IsNullOrWhiteSpace(publishedAt)) return publishedAt.Trim();

        var location = Assembly.GetEntryAssembly()?.Location;
        var built = !string.IsNullOrEmpty(location) && File.Exists(location)
            ? File.GetLastWriteTimeUtc(location)
            : DateTime.UtcNow;
        return built.ToString("yyyy-MM-ddTHH:mm:ssZ");
    }

    /// <summary>Logs the release time once at startup.</summary>
    public static void LogStartup(ILogger logger, string service, string publishedAt) =>
        logger.LogInformation("Release: {Service} published {PublishedAt}", service, publishedAt);
}
