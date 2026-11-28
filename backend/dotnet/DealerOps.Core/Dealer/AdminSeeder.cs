using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Data;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Creates the platform admin account from ADMIN_USERNAME and ADMIN_PASSWORD at startup, or fills a
/// missing email or phone on the existing one. A new account gets an APP_USER CREATE audit row by
/// actor <c>system</c>.
/// </summary>
public class AdminSeeder : IHostedService
{
    private readonly IServiceProvider _provider;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminSeeder> _logger;

    public AdminSeeder(IServiceProvider provider, IConfiguration config, ILogger<AdminSeeder> logger)
    {
        _provider = provider;
        _config = config;
        _logger = logger;
    }

    /// <summary>Seeds or completes the platform admin account; skipped when no admin is configured.</summary>
    public Task StartAsync(CancellationToken cancellationToken)
    {
        var username = _config["ADMIN_USERNAME"];
        var password = _config["ADMIN_PASSWORD"];
        var rawEmail = _config["ADMIN_EMAIL"];
        var rawPhone = _config["ADMIN_PHONE"];

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogInformation("ADMIN_USERNAME/ADMIN_PASSWORD not set; skipping platform admin seed");
            return Task.CompletedTask;
        }

        string? phone = null;
        if (!string.IsNullOrWhiteSpace(rawPhone))
        {
            phone = LoginIdentifiers.PhoneOrNull(rawPhone);
            if (phone == null)
                throw new InvalidOperationException("ADMIN_PHONE must include a valid international country code.");
        }

        string? email = null;
        if (!string.IsNullOrWhiteSpace(rawEmail))
        {
            try { email = LoginIdentifiers.Email(rawEmail); }
            catch (ApiException) { throw new InvalidOperationException("ADMIN_EMAIL must be a valid email address."); }
        }

        username = username.Trim();

        using var scope = _provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var audit = scope.ServiceProvider.GetRequiredService<IAuditService>();
        var existing = db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (existing != null)
        {
            // Backfilled contact fields are audited with their values; they were empty before.
            var changes = new Dictionary<string, object>();
            if (string.IsNullOrWhiteSpace(existing.Email) && email != null)
            { existing.Email = email; changes["email"] = email; }
            if (string.IsNullOrWhiteSpace(existing.Phone) && phone != null)
            { existing.Phone = phone; changes["phone"] = phone; }
            if (changes.Count > 0)
            {
                audit.Record("APP_USER", existing.Id, "UPDATE", null, "system", changes);
                db.SaveChanges();
            }
            return Task.CompletedTask;
        }

        var admin = new AppUserEntity
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            DisplayName = "Platform Admin",
            Email = email,
            Phone = phone,
            Role = AppRole.PlatformAdmin,
            DealerId = null,
            Active = true
        };
        using var tx = db.Database.BeginTransaction();
        db.AppUsers.Add(admin);
        db.SaveChanges();
        // No registration key: the seeded admin has no sign-up channel (see AccountSource).
        audit.Record("APP_USER", admin.Id, "CREATE", null, "system",
            new Dictionary<string, object> { ["username"] = username });
        db.SaveChanges();
        tx.Commit();
        _logger.LogInformation("Seeded platform admin account userId={UserId} username={Username}", admin.Id, username);
        return Task.CompletedTask;
    }

    /// <summary>Nothing to stop.</summary>
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
