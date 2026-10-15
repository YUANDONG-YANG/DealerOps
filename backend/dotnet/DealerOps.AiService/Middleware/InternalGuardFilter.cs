using System.Security.Cryptography;
using System.Text;

namespace DealerOps.AiService.Middleware;

public class InternalGuardFilter : IMiddleware
{
    private const string WellKnownDefaultToken = "dealer-internal";

    private readonly string _headerName;
    private readonly string _token;
    private readonly byte[] _expectedTokenBytes;
    private readonly bool _devMode;

    public InternalGuardFilter(IConfiguration config)
    {
        _headerName = config["AiService:InternalHeaderName"]
                      ?? config["INTERNAL_HEADER_NAME"]
                      ?? "X-Dealer-Internal";
        _token = config["INTERNAL_TOKEN"]
                 ?? config["AiService:InternalToken"]
                 ?? WellKnownDefaultToken;
        _expectedTokenBytes = Encoding.UTF8.GetBytes(_token);

        var jwtMode = config["JWT_MODE"] ?? config["dealerops:jwt:mode"] ?? "dev";
        _devMode = string.Equals(jwtMode.Trim(), "dev", StringComparison.OrdinalIgnoreCase);

        if (_token == WellKnownDefaultToken && !_devMode)
        {
            throw new InvalidOperationException(
                "Refusing to start: INTERNAL_TOKEN is the well-known default and JWT_MODE is not dev. " +
                "Set a non-default INTERNAL_TOKEN, or set JWT_MODE=dev for classroom/local only.");
        }
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/internal/", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/internal", StringComparison.OrdinalIgnoreCase))
        {
            if (_token == WellKnownDefaultToken && !_devMode)
            {
                context.Response.StatusCode = 404;
                return;
            }
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
