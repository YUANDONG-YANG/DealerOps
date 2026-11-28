using System.Text.RegularExpressions;
using DealerOps.Core.Common.Exceptions;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Canonical forms of the email addresses and phone numbers users sign in with, so the value
/// stored at registration matches the value typed at sign-in.
/// </summary>
public static class LoginIdentifiers
{
    private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly Regex PhoneDigitsPattern = new(@"^[1-9][0-9]{6,14}$", RegexOptions.Compiled);

    /// <summary>Returns the trimmed, lower-case email address, or throws a validation error.</summary>
    public static string Email(string raw)
    {
        var value = raw.Trim().ToLowerInvariant();
        if (!EmailPattern.IsMatch(value))
            throw new ApiException(ErrorCode.Validation, "Enter a valid email address.",
                new Dictionary<string, string> { ["email"] = "Enter a valid email address." });
        return value;
    }

    /// <summary>Returns the phone number in "+digits" form, or throws a validation error.</summary>
    public static string Phone(string raw)
    {
        var value = PhoneOrNull(raw);
        if (value == null)
            throw new ApiException(ErrorCode.Validation, "Enter a valid phone number with country code.",
                new Dictionary<string, string> { ["phone"] = "Enter a valid phone number with country code." });
        return value;
    }

    /// <summary>Returns the phone number in "+digits" form, or null when it is not a valid number.</summary>
    public static string? PhoneOrNull(string raw)
    {
        var digits = Regex.Replace(raw.Trim(), @"[\s().\-]", "");
        var international = digits.StartsWith('+');
        if (international)
            digits = digits[1..];
        // Ten digits without "+" is a local North American number, so its country code is 1.
        if (!international && digits.Length == 10)
            digits = "1" + digits;
        return PhoneDigitsPattern.IsMatch(digits) ? "+" + digits : null;
    }

    /// <summary>
    /// Returns the pre-"+1" stored form ("+" and ten local digits) of a local number, or null.
    /// Accounts saved before local numbers got their "+1" still hold this form.
    /// </summary>
    public static string? LegacyLocalPhoneOrNull(string raw)
    {
        var digits = Regex.Replace(raw.Trim(), @"[\s().\-]", "");
        return digits.Length == 10 && PhoneDigitsPattern.IsMatch(digits) ? "+" + digits : null;
    }
}
