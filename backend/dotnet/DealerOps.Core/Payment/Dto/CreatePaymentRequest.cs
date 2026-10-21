using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Payment.Dto;

/// <summary>A payment received for a sold vehicle, as entered by a dealer user.</summary>
/// <param name="Amount">Money received, more than 0 with at most 2 decimals; must not exceed the balance due.</param>
/// <param name="Method">How the buyer paid.</param>
/// <param name="PaidOn">Date the money was received, between the sold date and today.</param>
/// <param name="Note">Optional free text, at most 200 characters; never written to logs or the audit trail.</param>
public record CreatePaymentRequest(
    [Required(ErrorMessage = "Amount is required.")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be more than 0.")] decimal? Amount,
    [Required(ErrorMessage = "Payment method is required.")] PaymentMethod? Method,
    [Required(ErrorMessage = "Payment date is required.")] DateOnly? PaidOn,
    [MaxLength(200, ErrorMessage = "At most 200 characters.")] string? Note);
