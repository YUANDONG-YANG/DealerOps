namespace DealerOps.Core.Vehicle.Dto;

/// <summary>
/// The dealership's vehicle sales at a glance. Gross profit is sold price minus purchase and
/// repair cost. Months are the twelve most recent months with a sale, newest first.
/// <c>Period</c> is set only when a period was requested; <c>Salespeople</c> covers the requested
/// period, or all time without one.
/// </summary>
public record SalesReport(
    int SoldCount,
    decimal Revenue,
    decimal GrossProfit,
    decimal? AverageDaysToSell,
    int InStockCount,
    decimal InventoryCost,
    List<MonthlySales> Months,
    PeriodSales? Period,
    List<SalespersonSales> Salespeople);

/// <param name="Month">Calendar month as <c>yyyy-MM</c>.</param>
public record MonthlySales(string Month, int SoldCount, decimal Revenue, decimal GrossProfit);

/// <summary>A calendar period ending today (UTC): today, this ISO week from Monday, this month, this year.</summary>
public enum SalesPeriod
{
    Today,
    Week,
    Month,
    Year
}

/// <summary>Sales whose sold date falls in <c>From</c>..<c>To</c>, both inclusive.</summary>
public record PeriodSales(SalesPeriod Period, DateOnly From, DateOnly To, int SoldCount, decimal Revenue, decimal GrossProfit);

/// <summary>
/// One salesperson's figures: vehicles they sold (by <c>sold_by</c>) in the period, the leads they
/// own that are still open now, and the leads they own that were last updated as WON in the period.
/// </summary>
public record SalespersonSales(
    string Username,
    string DisplayName,
    bool ActiveMember,
    int SoldCount,
    decimal Revenue,
    decimal GrossProfit,
    int OpenLeads,
    int WonLeads);
