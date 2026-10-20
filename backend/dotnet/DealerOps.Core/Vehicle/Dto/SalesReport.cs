namespace DealerOps.Core.Vehicle.Dto;

/// <summary>
/// The dealership's vehicle sales at a glance. Gross profit is sold price minus purchase and
/// repair cost. Months are the twelve most recent months with a sale, newest first.
/// </summary>
public record SalesReport(
    int SoldCount,
    decimal Revenue,
    decimal GrossProfit,
    decimal? AverageDaysToSell,
    int InStockCount,
    decimal InventoryCost,
    List<MonthlySales> Months);

/// <param name="Month">Calendar month as <c>yyyy-MM</c>.</param>
public record MonthlySales(string Month, int SoldCount, decimal Revenue, decimal GrossProfit);
