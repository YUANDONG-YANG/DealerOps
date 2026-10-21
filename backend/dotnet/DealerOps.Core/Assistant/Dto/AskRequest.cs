using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Assistant.Dto;

/// <summary>A question for the assistant.</summary>
public record AskRequest([Required] string Text);
