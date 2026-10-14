using DealerOps.Core.WorkOrder;

namespace DealerOps.Core.WorkOrder.Dto;

public record WorkOrderResponse(
    long Id,
    long VehicleId,
    string Task,
    string? AssigneeUsername,
    WorkOrderStatus Status,
    DateOnly? DueOn,
    decimal? Cost,
    string? CompletionNote,
    DateOnly? CompletedOn,
    DateTime CreatedAt,
    int Version);
