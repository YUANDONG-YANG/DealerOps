using System.Security.Cryptography;
using System.Text;

namespace DealerOps.AiService.Middleware;

public class InternalGuardFilter : IMiddleware
{
    private readonly string _headerName;
    private readonly byte[] _expectedTokenBytes;

    public InternalGuardFilter(IConfiguration config)
    {
        _headerName = config["AiService:InternalHeaderName"]
                      ?? config["INTERNAL_HEADER_NAME"]
                      ?? "X-Dealer-Internal";
        var token = config["INTERNAL_TOKEN"]
                    ?? config["AiService:InternalToken"]
                    ?? "dealer-internal";
        _expectedTokenBytes = Encoding.UTF8.GetBytes(token);
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/internal/", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/internal", StringComparison.OrdinalIgnoreCase))
        {
            var header = context.Request.Headers[_headerName].FirstOrDefault();
            if (string.IsNullOrEmpty(header) || !ConstantTimeEquals(header))
            {
                context.Response.StatusCode = 404;
                return;
            }
        }
        await next(context);
    }

    private bool ConstantTimeEquals(string presented)
    {
        var presentedBytes = Encoding.UTF8.GetBytes(presented);
        return CryptographicOperations.FixedTimeEquals(_expectedTokenBytes, presentedBytes);
    }
}
