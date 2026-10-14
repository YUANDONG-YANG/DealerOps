namespace DealerOps.Core.Lead;

public enum LeadStage
{
    New,
    Contacted,
    Qualified,
    Won,
    Lost
}

public static class LeadStageExtensions
{
    public static bool IsClosed(this LeadStage stage) => stage is LeadStage.Won or LeadStage.Lost;
}
