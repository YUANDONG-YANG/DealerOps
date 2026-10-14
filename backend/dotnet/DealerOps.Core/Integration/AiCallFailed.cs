namespace DealerOps.Core.Integration;

public class AiCallFailed : Exception
{
    public AiCallFailed(string message) : base(message) { }
    public AiCallFailed(string message, Exception inner) : base(message, inner) { }
}
