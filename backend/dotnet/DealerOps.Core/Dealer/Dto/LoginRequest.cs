using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record LoginRequest(
    [Required, DefaultValue("admin")] string Identifier,
    [Required, DefaultValue("admin123")] string Password);
