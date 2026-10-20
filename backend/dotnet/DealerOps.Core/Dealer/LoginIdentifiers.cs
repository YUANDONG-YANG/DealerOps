using System.Text.RegularExpressions;
using DealerOps.Core.Common.Exceptions;

namespace DealerOps.Core.Dealer;

public static class LoginIdentifiers
{
    private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly Regex PhoneDigitsPattern = new(@"^[1-9][0-9]{6,14}$", RegexOptions.Compiled);

    public static string Email(string raw)
    {
        var value = raw.Trim().ToLowerInvariant();
        if (!EmailPattern.IsMatch(value))
            throw new ApiException(ErrorCode.Validation, "Enter a valid email address.",
                new Dictionary<string, string> { ["email"] = "Enter a valid email address." });
        return value;
    }

    public static string Phone(string raw)
    {
        var value = PhoneOrNull(raw);
        if (value == null)
            throw new ApiException(ErrorCode.Validation, "Enter a valid phone number with country code.",
                new Dictionary<string, string> { ["phone"] = "Enter a valid phone number with country code." });
        return value;
    }

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

    // Accounts saved before local numbers got their "+1" hold "+" and the ten local digits.
    public static string? LegacyLocalPhoneOrNull(string raw)
    {
        var digits = Regex.Replace(raw.Trim(), @"[\s().\-]", "");
        return digits.Length == 10 && PhoneDigitsPattern.IsMatch(digits) ? "+" + digits : null;
    }
}
