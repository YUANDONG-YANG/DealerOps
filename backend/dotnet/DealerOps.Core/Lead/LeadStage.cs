namespace DealerOps.Core.Lead;

/// <summary>Lead pipeline stages in funnel order; WON and LOST are closed and cannot change.</summary>
public enum LeadStage
{
    New,
    Contacted,
    Qualified,
    Won,
    Lost
}

/// <summary>Helpers on <see cref="LeadStage"/>.</summary>
public static class LeadStageExtensions
{
    /// <summary>True for WON and LOST, the stages that end a lead.</summary>
    public static bool IsClosed(this LeadStage stage) => stage is LeadStage.Won or LeadStage.Lost;
}
