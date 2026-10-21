namespace DealerOps.AiService.Support;

/// <summary>
/// A handled AI failure with its HTTP status and stable error code (AI_TIMEOUT, AI_KEY_MISSING,
/// AI_PROVIDER_FAILED, AI_BUSY).
/// </summary>
public class ModelFailureException : Exception
{
    public const string Timeout = "AI_TIMEOUT";
    public const string KeyMissing = "AI_KEY_MISSING";
    public const string ProviderFailed = "AI_PROVIDER_FAILED";
    public const string Busy = "AI_BUSY";

    public int StatusCode { get; }
    public string Code { get; }

    public ModelFailureException(int statusCode, string code, string message) : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    public static ModelFailureException TimeoutError() =>
        new(504, Timeout, "Model call exceeded 15s.");

    public static ModelFailureException KeyMissingError() =>
        new(503, KeyMissing, "AIMANAGER_API_KEY is missing or invalid.");

    public static ModelFailureException BusyError() =>
        new(503, Busy, "Too many AI calls are in flight; retry shortly.");

    public static ModelFailureException ProviderFailedError() =>
        new(502, ProviderFailed, "Model did not return a usable result.");
}
