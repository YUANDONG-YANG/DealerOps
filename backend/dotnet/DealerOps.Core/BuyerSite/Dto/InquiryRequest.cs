using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Customer.Dto;

namespace DealerOps.Core.BuyerSite.Dto;

/// <summary>
/// A buyer's question about a listed vehicle. The contact fields follow the CRM customer rules,
/// because the inquiry becomes a customer and a new lead.
/// </summary>
public record InquiryRequest(
    [Required(ErrorMessage = "Choose a vehicle.")] long? VehicleId,
    [Required] CreateCustomerRequest Contact,
    [NotBlank(ErrorMessage = "Message is required.")]
    [MaxLength(1000, ErrorMessage = "Message must be at most 1000 characters.")]
    string Message);
