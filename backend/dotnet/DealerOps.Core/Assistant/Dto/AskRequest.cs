using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Assistant.Dto;

public record AskRequest([Required] string Text);
