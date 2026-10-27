namespace DealerOps.AiService.Dto;

/// <summary>Successful ad-check result.</summary>
/// <param name="Success">Always true for this body.</param>
/// <param name="Notes">Advisory notes, at most eight. Never a pass invented from an empty model reply.</param>
public record AdCheckOkResponse(bool Success, List<AiNote> Notes);
