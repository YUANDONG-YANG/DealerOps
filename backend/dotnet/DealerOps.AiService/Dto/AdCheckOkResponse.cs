namespace DealerOps.AiService.Dto;

/// <summary>Successful ad-check result.</summary>
public record AdCheckOkResponse(bool Success, List<AiNote> Notes);
