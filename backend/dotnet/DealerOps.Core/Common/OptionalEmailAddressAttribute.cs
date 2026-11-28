using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Common;

/// <summary>
/// A missing or blank email is omitted, not invalid. A non-blank value must be an email address.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class OptionalEmailAddressAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is not string text || string.IsNullOrWhiteSpace(text))
            return ValidationResult.Success;

        var email = new EmailAddressAttribute();
        return email.IsValid(text)
            ? ValidationResult.Success
            : new ValidationResult("The Email field is not a valid e-mail address.");
    }
}
