namespace DealerOps.AiService.Support;

/// <summary>
/// A handled AI failure with its HTTP status and stable error code (AI_TIMEOUT, AI_KEY_MISSING,
/// AI_PROVIDER_FAILED, AI_BUSY).
/// </summary>
public class ModelFailureException : Exception
{
    /// <summary>Stable code when the model call exceeds the time budget.</summary>
    public const string Timeout = "AI_TIMEOUT";

    /// <summary>Stable code when the provider API key is missing.</summary>
    public const string KeyMissing = "AI_KEY_MISSING";

    /// <summary>Stable code when the provider returns an error or an unusable result.</summary>
    public const string ProviderFailed = "AI_PROVIDER_FAILED";

    /// <summary>Stable code when the concurrency cap rejects the call before it starts.</summary>
    public const string Busy = "AI_BUSY";

    /// <summary>HTTP status Core should return for this failure.</summary>
    public int StatusCode { get; }

    /// <summary>Stable error code. One of <see cref="Timeout"/>, <see cref="KeyMissing"/>, <see cref="ProviderFailed"/>, or <see cref="Busy"/>.</summary>
    public string Code { get; }

    /// <summary>Creates a handled failure with the status and code Core maps to a response.</summary>
    /// <param name="statusCode">HTTP status for this failure.</param>
    /// <param name="code">Stable code such as <see cref="Timeout"/>.</param>
    /// <param name="message">Short message safe to return to Core. No prompts or secrets.</param>
    public ModelFailureException(int statusCode, string code, string message) : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    /// <summary>The model call exceeded the connect plus response budget.</summary>
    /// <returns>A 504 failure with code <see cref="Timeout"/>.</returns>
    public static ModelFailureException TimeoutError() =>
        new(504, Timeout, "Model call exceeded 15s.");

    /// <summary>The provider API key is missing, so no outbound call is attempted.</summary>
    /// <returns>A 503 failure with code <see cref="KeyMissing"/>.</returns>
    public static ModelFailureException KeyMissingError() =>
        new(503, KeyMissing, "AIMANAGER_API_KEY is missing or invalid.");

    /// <summary>The concurrency cap rejected the call before it reached the provider.</summary>
    /// <returns>A 503 failure with code <see cref="Busy"/>.</returns>
    public static ModelFailureException BusyError() =>
        new(503, Busy, "Too many AI calls are in flight; retry shortly.");

    /// <summary>The provider returned an error status or a result this service cannot use.</summary>
    /// <returns>A 502 failure with code <see cref="ProviderFailed"/>.</returns>
    public static ModelFailureException ProviderFailedError() =>
        new(502, ProviderFailed, "Model did not return a usable result.");
}
