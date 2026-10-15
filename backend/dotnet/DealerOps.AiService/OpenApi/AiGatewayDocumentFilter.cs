using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace DealerOps.AiService.OpenApi;

/// <summary>
/// The AI service is exposed to the frontend through the Gateway's public AI route.
/// Keep the service controllers internal while documenting the Gateway-facing path.
/// </summary>
public sealed class AiGatewayDocumentFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        var paths = swaggerDoc.Paths.ToList();
        foreach (var (path, item) in paths)
        {
            if (!path.StartsWith("/internal/v1/", StringComparison.Ordinal))
                continue;

            swaggerDoc.Paths.Remove(path);
            swaggerDoc.Paths["/api/v1/ai/" + path["/internal/v1/".Length..]] = item;
        }
    }
}
