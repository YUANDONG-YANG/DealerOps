namespace DealerOps.Core.Common.Exceptions;

public class ApiException : Exception
{
    public ErrorCode Code { get; }
    public Dictionary<string, string>? FieldErrors { get; }

    public ApiException(ErrorCode code, string message, Dictionary<string, string>? fieldErrors = null)
        : base(message)
    {
        Code = code;
        FieldErrors = fieldErrors;
    }
}
