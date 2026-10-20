namespace DealerOps.Core.Lead.Dto;

/// <param name="OpenLeads">Leads still in New, Contacted or Qualified.</param>
/// <param name="WonRatePercent">Won share of closed leads (won + lost); 0 when none are closed.</param>
public record SalesFunnelReport(long TotalLeads, long OpenLeads, List<FunnelStageCount> Stages, decimal WonRatePercent);

public record FunnelStageCount(string Stage, long Count, decimal PercentOfTotal);
