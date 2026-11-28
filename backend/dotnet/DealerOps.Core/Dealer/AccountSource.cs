using System.Text.Json;
using DealerOps.Core.Audit;
using DealerOps.Core.Data;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Dealer;

/// <summary>
/// How an account first entered DealerOps: <c>google</c>, <c>firebase</c> (email sign-up),
/// <c>password</c> (self-registration form) or <c>admin</c> (added by a platform admin).
/// Read from the account's APP_USER CREATE audit row; an account without one falls back to the
/// identity it carries, or null when the channel is unknown (for example seeded data).
/// </summary>
public static class AccountSource
{
    /// <summary>Sign-up channel per username; missing users are left out of the result.</summary>
    public static Dictionary<string, string?> For(AppDbContext db, IEnumerable<string> usernames)
    {
        var names = usernames.Distinct().ToList();
        var users = db.AppUsers.AsNoTracking()
            .Where(u => names.Contains(u.Username))
            .Select(u => new { u.Id, u.Username, u.GoogleSub, u.FirebaseUid })
            .ToList();
        var ids = users.Select(u => u.Id).ToList();
        var recorded = db.AuditEvents.AsNoTracking()
            .Where(a => a.EntityType == EntityType.AppUser && a.Action == AuditAction.Create
                        && ids.Contains(a.EntityId))
            .Select(a => new { a.EntityId, a.FieldSummary })
            .ToList()
            .GroupBy(a => a.EntityId)
            .ToDictionary(g => g.Key, g => g.Select(a => Registration(a.FieldSummary)).FirstOrDefault(r => r != null));

        return users.ToDictionary(u => u.Username, u =>
            recorded.GetValueOrDefault(u.Id)
            ?? (u.GoogleSub != null ? "google" : u.FirebaseUid != null ? "firebase" : null));
    }

    private static string? Registration(string? summary)
    {
        if (string.IsNullOrEmpty(summary)) return null;
        using var doc = JsonDocument.Parse(summary);
        return doc.RootElement.TryGetProperty("registration", out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }
}
