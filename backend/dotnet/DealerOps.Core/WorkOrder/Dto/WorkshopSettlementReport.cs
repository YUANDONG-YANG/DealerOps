namespace DealerOps.Core.WorkOrder.Dto;

/// <summary>
/// Workshop settlement: what the dealership's work orders cost. Only done work orders carry a
/// settled cost; open and in-progress orders are counted as outstanding work.
/// </summary>
/// <param name="Months">The twelve most recent months with a completed work order, newest first.</param>
/// <param name="Assignees">One row per assignee, with unassigned orders under a null username.</param>
public record WorkshopSettlementReport(
    int OpenCount,
    int InProgressCount,
    int DoneCount,
    decimal SettledCost,
    List<MonthlyWorkshop> Months,
    List<AssigneeWorkshop> Assignees);

/// <param name="Month">Completion month as <c>yyyy-MM</c>.</param>
public record MonthlyWorkshop(string Month, int DoneCount, decimal SettledCost);

public record AssigneeWorkshop(string? AssigneeUsername, int OutstandingCount, int DoneCount, decimal SettledCost);
