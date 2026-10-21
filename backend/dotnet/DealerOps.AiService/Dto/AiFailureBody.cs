namespace DealerOps.AiService.Dto;

/// <summary>Failure body returned for every AI error.</summary>
public record AiFailureBody(bool Success, string Code, string Message)
{
    public static AiFailureBody Of(string code, string message) => new(false, code, message);
}
