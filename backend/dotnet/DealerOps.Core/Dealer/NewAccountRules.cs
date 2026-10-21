using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Data;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Validation shared by every account-creating flow (registration, Google, Firebase and admin
/// creation): canonical contact details and uniqueness of username, display name, email and phone.
/// </summary>
public class NewAccountRules
{
    public record Contact(string? Email, string? Phone);

    private readonly AppDbContext _db;

    public NewAccountRules(AppDbContext db) => _db = db;

    /// <summary>
    /// Requires an email or a phone number and returns both in canonical form; reports every
    /// invalid field in one validation error.
    /// </summary>
    public Contact CanonicalContact(string? rawEmail, string? rawPhone)
    {
        var noEmail = string.IsNullOrWhiteSpace(rawEmail);
        var noPhone = string.IsNullOrWhiteSpace(rawPhone);
        if (noEmail && noPhone)
        {
            const string msg = "Enter an email address or a phone number.";
            throw new ApiException(ErrorCode.Validation, msg,
                new Dictionary<string, string> { ["email"] = msg, ["phone"] = msg });
        }

        var invalid = new Dictionary<string, string>();
        string? email = null;
        string? phone = null;
        if (!noEmail)
        {
            try { email = LoginIdentifiers.Email(rawEmail!); }
            catch (ApiException ex) { foreach (var kv in ex.FieldErrors!) invalid[kv.Key] = kv.Value; }
        }
        if (!noPhone)
        {
            try { phone = LoginIdentifiers.Phone(rawPhone!); }
            catch (ApiException ex) { foreach (var kv in ex.FieldErrors!) invalid[kv.Key] = kv.Value; }
        }
        if (invalid.Count > 0)
            throw new ApiException(ErrorCode.Validation, invalid.Values.First(), invalid);

        return new Contact(email, phone);
    }

    /// <summary>Throws a conflict naming every field already registered to another account.</summary>
    public void RequireAvailable(string username, string displayName, Contact contact)
    {
        var taken = new Dictionary<string, string>();
        ErrorCode? first = null;

        if (_db.AppUsers.Any(u => u.Username == username))
        { first = Put(taken, first, "username", ErrorCode.UsernameTaken, "That username is already taken."); }

        if (_db.AppUsers.Any(u => EF.Functions.Like(u.DisplayName, displayName)))
        { first = Put(taken, first, "displayName", ErrorCode.DisplayNameTaken, "That full name is already registered."); }

        if (contact.Email != null && _db.AppUsers.Any(u => u.Email != null && EF.Functions.Like(u.Email, contact.Email)))
        { first = Put(taken, first, "email", ErrorCode.EmailTaken, "That email address is already registered."); }

        if (contact.Phone != null && _db.AppUsers.Any(u => u.Phone == contact.Phone))
        { first = Put(taken, first, "phone", ErrorCode.PhoneTaken, "That phone number is already registered."); }

        if (first.HasValue)
            throw new ApiException(first.Value, taken.Values.First(), taken);
    }

    /// <summary>
    /// Maps a unique-index violation raised by SaveChanges to the matching field conflict, for a
    /// race that RequireAvailable could not see.
    /// </summary>
    public ApiException Conflict(DbUpdateException ex)
    {
        var cause = ex.InnerException?.Message ?? ex.Message;
        var conflicts = new (string Field, ErrorCode Code, string Constraint, string Message)[]
        {
            ("username", ErrorCode.UsernameTaken, "uk_user_username", "That username is already taken."),
            ("displayName", ErrorCode.DisplayNameTaken, "uk_app_user_display_name", "That full name is already registered."),
            ("email", ErrorCode.EmailTaken, "uk_app_user_email", "That email address is already registered."),
            ("phone", ErrorCode.PhoneTaken, "uk_app_user_phone", "That phone number is already registered."),
        };

        foreach (var c in conflicts)
        {
            if (cause.Contains(c.Constraint, StringComparison.OrdinalIgnoreCase))
                return new ApiException(c.Code, c.Message, new Dictionary<string, string> { [c.Field] = c.Message });
        }

        return new ApiException(ErrorCode.UsernameTaken, "That username is already taken.",
            new Dictionary<string, string> { ["username"] = "That username is already taken." });
    }

    private static ErrorCode Put(Dictionary<string, string> taken, ErrorCode? first,
        string field, ErrorCode code, string message)
    {
        taken[field] = message;
        return first ?? code;
    }
}
