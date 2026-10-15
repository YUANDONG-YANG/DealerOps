using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace DealerOps.Core.OpenApi;

public sealed class LoginOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (!string.Equals(context.ApiDescription.RelativePath, "api/v1/auth/login", StringComparison.OrdinalIgnoreCase))
            return;

        if (operation.RequestBody?.Content.TryGetValue("application/json", out var mediaType) == true)
        {
            mediaType.Example = new OpenApiObject
            {
                ["identifier"] = new OpenApiString("admin"),
                ["password"] = new OpenApiString("admin123")
            };
        }
    }
}
