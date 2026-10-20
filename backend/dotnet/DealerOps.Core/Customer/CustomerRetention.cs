using DealerOps.Core.Audit;
using DealerOps.Core.Data;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Customer;

/// <summary>
/// PIPEDA limited retention (NFR-07). A soft-deleted customer (CRM-14) keeps its row so leads,
/// links and audit history stay intact, but its personal information is anonymized once it has
/// been deleted for <c>Retention:DeletedCustomerDays</c> (default 730; 0 turns it off). Runs at
/// startup and then daily. Each anonymization is audited as a customer <c>UPDATE</c> by
/// <c>system</c>, recording field names only (AUD-04).
/// </summary>
public class CustomerRetention : BackgroundService
{
    private readonly IServiceProvider _provider;
    private readonly ILogger<CustomerRetention> _logger;
    private readonly int _days;

    public CustomerRetention(IServiceProvider provider, IConfiguration config, ILogger<CustomerRetention> logger)
    {
        _provider = provider;
        _logger = logger;
        _days = config.GetValue("Retention:DeletedCustomerDays", 730);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_days <= 0) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                AnonymizeExpired();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Customer retention run failed");
            }
            await Task.Delay(TimeSpan.FromDays(1), stoppingToken);
        }
    }

    private void AnonymizeExpired()
    {
        using var scope = _provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var audit = scope.ServiceProvider.GetRequiredService<IAuditService>();
        var cutoff = DateTime.UtcNow.AddDays(-_days);

        // No tenant is set in a background scope, so the tenant filter is bypassed explicitly.
        var expired = db.Customers.IgnoreQueryFilters()
            .Where(c => c.DeletedAt != null && c.DeletedAt < cutoff && !c.Name.StartsWith("Deleted customer #"))
            .ToList();
        foreach (var customer in expired)
        {
            customer.Name = $"Deleted customer #{customer.Id}";
            customer.Email = $"deleted-{customer.Id}@invalid.example";
            customer.Phone = "0000000";
            customer.HomeAddress = "Removed";
            audit.Record("CUSTOMER", customer.Id, "UPDATE", customer.DealerId, "system",
                new Dictionary<string, object>
                {
                    ["anonymized"] = true, ["name"] = true, ["email"] = true, ["phone"] = true, ["homeAddress"] = true
                });
        }
        db.SaveChanges();
        if (expired.Count > 0)
            _logger.LogInformation("Anonymized {Count} customers deleted before {Cutoff:o}", expired.Count, cutoff);
    }
}
