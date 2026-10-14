namespace DealerOps.AiService.Dto;

public record AiFailureBody(bool Success, string Code, string Message)
{
    public static AiFailureBody Of(string code, string message) => new(false, code, message);
}
