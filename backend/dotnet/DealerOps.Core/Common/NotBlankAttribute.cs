using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Common;

/// <summary>
/// Rejects null, empty, and whitespace-only strings. <see cref="RequiredAttribute"/> treats
/// a string of spaces as present.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class NotBlankAttribute : ValidationAttribute
{
    public NotBlankAttribute() : base("Must not be blank.") { }

    public override bool IsValid(object? value) =>
        value is string text && text.Trim().Length > 0;
}
