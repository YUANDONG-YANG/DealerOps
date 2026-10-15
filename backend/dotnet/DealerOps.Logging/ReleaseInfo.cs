using System.Reflection;
using Microsoft.Extensions.Logging;

namespace DealerOps.Logging;

public static class ReleaseInfo
{
    // Deployments write PUBLISHED_AT; without it the assembly build time identifies the running build.
    public static string Resolve(string? publishedAt)
    {
        if (!string.IsNullOrWhiteSpace(publishedAt)) return publishedAt.Trim();

        var location = Assembly.GetEntryAssembly()?.Location;
        var built = !string.IsNullOrEmpty(location) && File.Exists(location)
            ? File.GetLastWriteTimeUtc(location)
            : DateTime.UtcNow;
        return built.ToString("yyyy-MM-ddTHH:mm:ssZ");
    }

    public static void LogStartup(ILogger logger, string service, string publishedAt) =>
        logger.LogInformation("Release: {Service} published {PublishedAt}", service, publishedAt);
}
