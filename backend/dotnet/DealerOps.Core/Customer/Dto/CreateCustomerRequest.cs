using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Customer.Dto;

public record CreateCustomerRequest(
    [Required][MaxLength(100)] string Name,
    [Required][EmailAddress][MaxLength(254)] string Email,
    [Required]
    [RegularExpression(@"^(?=(?:\D*\d){7,20}\D*$)[0-9+\-() ]+$")]
    [MaxLength(40)]
    string Phone,
    [Required][MaxLength(300)] string HomeAddress);
