using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Payment.Dto;

public record CreatePaymentRequest(
    [Required(ErrorMessage = "Amount is required.")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be more than 0.")] decimal? Amount,
    [Required(ErrorMessage = "Payment method is required.")] PaymentMethod? Method,
    [Required(ErrorMessage = "Payment date is required.")] DateOnly? PaidOn,
    [MaxLength(200, ErrorMessage = "At most 200 characters.")] string? Note);
