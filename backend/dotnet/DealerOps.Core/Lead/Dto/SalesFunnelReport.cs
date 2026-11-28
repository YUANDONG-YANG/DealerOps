namespace DealerOps.Core.Lead.Dto;

/// <summary>Lead funnel for one dealership: stage counts, win rate, and monthly stage entries.</summary>
/// <param name="OpenLeads">Leads still in New, Contacted or Qualified.</param>
/// <param name="WonRatePercent">Won share of closed leads (won + lost); 0 when none are closed.</param>
/// <param name="Months">Stage history: how many leads entered each stage per month, read from the
/// lead audit trail. The twelve most recent months with any stage change, newest first.</param>
public record SalesFunnelReport(long TotalLeads, long OpenLeads, List<FunnelStageCount> Stages, decimal WonRatePercent,
    List<MonthlyLeadStages> Months);

/// <summary>How many leads are in one funnel stage, and their share of the report total.</summary>
public record FunnelStageCount(string Stage, long Count, decimal PercentOfTotal);

/// <summary>Leads that entered each stage during one calendar month.</summary>
/// <param name="Month">Calendar month as <c>yyyy-MM</c> (UTC).</param>
/// <param name="Stages">Leads that entered each stage that month, in funnel order.</param>
public record MonthlyLeadStages(string Month, List<FunnelStageCount> Stages);
