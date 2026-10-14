using System.ComponentModel.DataAnnotations;
using DealerOps.Core.WorkOrder;

namespace DealerOps.Core.WorkOrder.Dto;

public record PatchWorkOrderRequest(
    [Required] WorkOrderStatus Status,
    [Required][MaxLength(200)] string Task,
    [MaxLength(64)] string? AssigneeUsername,
    DateOnly? DueOn,
    [Range(0, double.MaxValue)] decimal? Cost,
    [MaxLength(500)] string? CompletionNote,
    [Required] int Version);
