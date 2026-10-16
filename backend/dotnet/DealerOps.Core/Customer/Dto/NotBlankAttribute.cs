using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Customer.Dto;

/// <summary>
/// Required, and a string value must hold at least one non-whitespace character,
/// so a blank "   " is rejected instead of being stored as an empty field (CRM-01).
/// </summary>
public sealed class NotBlankAttribute : RequiredAttribute
{
    public override bool IsValid(object? value)
        => value is string text ? !string.IsNullOrWhiteSpace(text) : base.IsValid(value);
}
