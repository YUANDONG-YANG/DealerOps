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
        if (digits.StartsWith('+'))
            digits = digits[1..];
        return PhoneDigitsPattern.IsMatch(digits) ? "+" + digits : null;
    }
}
