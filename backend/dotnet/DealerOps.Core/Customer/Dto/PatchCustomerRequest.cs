using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Customer.Dto;

public record PatchCustomerRequest(
    [Required(ErrorMessage = "Version is required.")]
    int Version,

    [NotBlank(ErrorMessage = "Name is required.")]
    [MaxLength(100, ErrorMessage = "Name must be at most 100 characters.")]
    string Name,

    [NotBlank(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Email must be a valid email address.")]
    [MaxLength(254, ErrorMessage = "Email must be at most 254 characters.")]
    string Email,

    [NotBlank(ErrorMessage = "Phone is required.")]
    [RegularExpression(@"^(?=(?:\D*\d){7,20}\D*$)[0-9+\-() ]+$",
        ErrorMessage = "Phone must contain 7 to 20 digits and may use + - ( ) and spaces.")]
    [MaxLength(40, ErrorMessage = "Phone must be at most 40 characters.")]
    string Phone,

    [NotBlank(ErrorMessage = "Home address is required.")]
    [MaxLength(300, ErrorMessage = "Home address must be at most 300 characters.")]
    string HomeAddress);
