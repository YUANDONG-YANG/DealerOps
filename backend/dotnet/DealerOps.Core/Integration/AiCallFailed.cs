namespace DealerOps.Core.Integration;

/// <summary>The AI service could not be reached, timed out, or returned an unusable answer.</summary>
public class AiCallFailed : Exception
{
    public AiCallFailed(string message) : base(message) { }
    public AiCallFailed(string message, Exception inner) : base(message, inner) { }
}
