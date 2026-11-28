using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.WorkOrder.Dto;

public record CreateWorkOrderRequest(
    [Required][MaxLength(200)] string Task,
    [MaxLength(64)] string? AssigneeUsername,
    DateOnly? DueOn);
