using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Data;

namespace DealerOps.Core.Dealer;

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

        var existing = db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (existing != null)
        {
            var changed = false;
            if (string.IsNullOrWhiteSpace(existing.Email) && email != null)
            { existing.Email = email; changed = true; }
            if (string.IsNullOrWhiteSpace(existing.Phone) && phone != null)
            { existing.Phone = phone; changed = true; }
            if (changed) db.SaveChanges();
            return Task.CompletedTask;
        }

        db.AppUsers.Add(new AppUserEntity
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            DisplayName = "Platform Admin",
            Email = email,
            Phone = phone,
            Role = AppRole.PlatformAdmin,
            DealerId = null,
            Active = true
        });
        db.SaveChanges();
        _logger.LogInformation("Seeded platform admin account '{Username}'", username);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
