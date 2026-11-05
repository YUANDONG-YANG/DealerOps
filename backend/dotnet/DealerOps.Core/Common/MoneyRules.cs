using DealerOps.Core.Common.Exceptions;

namespace DealerOps.Core.Common;

/// <summary>
/// Shared rules for the money amounts the API accepts. Every amount is stored as
/// <c>decimal(12,2)</c>, so a third decimal is refused rather than rounded (design/14 §4.2):
/// rounding would persist an amount the client never sent and was never shown.
/// </summary>
public static class MoneyRules
{
    /// <summary>Refuses an amount with more than two decimals, reporting it on its own field.</summary>
    public static void RequireCents(string field, decimal? amount)
    {
        if (amount is decimal value && decimal.Round(value, 2) != value)
        {
            const string message = "Use at most 2 decimals.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { [field] = message });
        }
    }
}
