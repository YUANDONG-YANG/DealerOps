using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Lead;

namespace DealerOps.Core.Lead.Dto;

/// <summary>Reopens a closed lead to the given open stage (NEW, CONTACTED or QUALIFIED).</summary>
public record ReopenLeadRequest(
    [Required] LeadStage Stage,
    [Required] int Version);
