using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Lead;

namespace DealerOps.Core.Lead.Dto;

public record PatchLeadRequest(
    [Required] LeadStage Stage,
    [MaxLength(64)] string? OwnerUsername,
    DateOnly? NextFollowUpOn,
    long? VehicleId,
    [MaxLength(300)] string? LostReason,
    [Required] int Version);
