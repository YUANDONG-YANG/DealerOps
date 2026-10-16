using DealerOps.Core.Audit;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Compliance;
using DealerOps.Core.Customer;
using DealerOps.Core.Dealer;
using DealerOps.Core.Lead;
using DealerOps.Core.Listing;
using DealerOps.Core.Notifications;
using DealerOps.Core.Photo;
using DealerOps.Core.Vehicle;
using DealerOps.Core.WorkOrder;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace DealerOps.Core.Data;

public class AppDbContext : DbContext
{
    private long? _tenantDealerId;

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AppUserEntity> AppUsers => Set<AppUserEntity>();
    public DbSet<DealerEntity> Dealers => Set<DealerEntity>();
    public DbSet<MembershipEntity> Memberships => Set<MembershipEntity>();
    public DbSet<VehicleEntity> Vehicles => Set<VehicleEntity>();
    public DbSet<CustomerEntity> Customers => Set<CustomerEntity>();
    public DbSet<CustomerVehicleEntity> CustomerVehicles => Set<CustomerVehicleEntity>();
    public DbSet<LeadEntity> Leads => Set<LeadEntity>();
    public DbSet<LeadNoteEntity> LeadNotes => Set<LeadNoteEntity>();
    public DbSet<ListingEntity> Listings => Set<ListingEntity>();
    public DbSet<ComplianceCheckEntity> ComplianceChecks => Set<ComplianceCheckEntity>();
    public DbSet<AuditEventEntity> AuditEvents => Set<AuditEventEntity>();
    public DbSet<VehiclePhotoEntity> VehiclePhotos => Set<VehiclePhotoEntity>();
    public DbSet<WorkOrderEntity> WorkOrders => Set<WorkOrderEntity>();
    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();

    public void SetTenantDealerId(long? dealerId) => _tenantDealerId = dealerId;

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        ConfigureVehicle(mb);
        ConfigureCustomer(mb);
        ConfigureListing(mb);
        ConfigureCompliance(mb);
        ConfigureLead(mb);
        ConfigureWorkOrder(mb);
        ConfigurePhoto(mb);
        ConfigureDealer(mb);
        ConfigureAudit(mb);

        ApplyTenantFilters(mb);
    }

    private static void ConfigureVehicle(ModelBuilder mb)
    {
        mb.Entity<VehicleEntity>(e =>
        {
            e.HasIndex(v => new { v.DealerId, v.Vin }).IsUnique().HasDatabaseName("uk_vehicle_vin");
            e.Property(v => v.Source).HasConversion(new EnumSnakeCaseConverter<VehicleSource>()).HasMaxLength(32);
            e.Property(v => v.ConditionCode).HasConversion(new EnumSnakeCaseConverter<ConditionCode>()).HasMaxLength(24);
            e.Property(v => v.Status).HasConversion(new EnumSnakeCaseConverter<VehicleStatus>()).HasMaxLength(16);
        });
    }

    private static void ConfigureCustomer(ModelBuilder mb)
    {
        mb.Entity<CustomerVehicleEntity>(e =>
        {
            e.HasIndex(cv => cv.VehicleId).IsUnique().HasDatabaseName("uk_cv_vehicle");
        });
    }

    private static void ConfigureListing(ModelBuilder mb)
    {
        mb.Entity<ListingEntity>(e =>
        {
            e.HasIndex(l => l.VehicleId).IsUnique().HasDatabaseName("uk_listing_vehicle");
            e.Property(l => l.AdKind).HasConversion(new EnumSnakeCaseConverter<AdKind>()).HasMaxLength(16);
            e.Property(l => l.Medium).HasConversion(new EnumSnakeCaseConverter<AdMedium>()).HasMaxLength(32);
            e.Property(l => l.Status).HasConversion(new EnumSnakeCaseConverter<ListingStatus>()).HasMaxLength(32);
        });
    }

    private static void ConfigureCompliance(ModelBuilder mb)
    {
        mb.Entity<ComplianceCheckEntity>(e =>
        {
            e.Property(c => c.AiStatus).HasConversion(new EnumSnakeCaseConverter<AiStatus>()).HasMaxLength(24);
            e.Property(c => c.Recommendation).HasConversion(new EnumSnakeCaseConverter<Recommendation>()).HasMaxLength(32);
        });
    }

    private static void ConfigureLead(ModelBuilder mb)
    {
        mb.Entity<LeadEntity>(e =>
        {
            e.Property(l => l.Stage).HasConversion(new EnumSnakeCaseConverter<LeadStage>()).HasMaxLength(16);
        });
    }

    private static void ConfigureWorkOrder(ModelBuilder mb)
    {
        mb.Entity<WorkOrderEntity>(e =>
        {
            e.Property(w => w.Status).HasConversion(new EnumSnakeCaseConverter<WorkOrderStatus>()).HasMaxLength(16);
        });
    }

    private static void ConfigurePhoto(ModelBuilder mb)
    {
        mb.Entity<VehiclePhotoEntity>(e =>
        {
            e.Property(p => p.Enhancement).HasConversion(new EnumSnakeCaseConverter<PhotoPreset>()).HasMaxLength(16);
        });
    }

    private static void ConfigureDealer(ModelBuilder mb)
    {
        mb.Entity<AppUserEntity>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique().HasDatabaseName("uk_user_username");
            e.HasIndex(u => u.Email).IsUnique().HasDatabaseName("uk_app_user_email");
            e.HasIndex(u => u.Phone).IsUnique().HasDatabaseName("uk_app_user_phone");
            e.HasIndex(u => u.DisplayName).IsUnique().HasDatabaseName("uk_app_user_display_name");
            e.Property(u => u.Role).HasConversion(
                new ValueConverter<AppRole, string>(
                    v => v.Value,
                    v => AppRole.FromValue(v)!))
                .HasMaxLength(32);
        });

        mb.Entity<MembershipEntity>(e =>
        {
            e.HasIndex(m => new { m.DealerId, m.Username }).IsUnique().HasDatabaseName("uk_membership");
        });
    }

    private static void ConfigureAudit(ModelBuilder mb)
    {
        mb.Entity<AuditEventEntity>(e =>
        {
            e.Property(a => a.EntityType).HasConversion(new EnumSnakeCaseConverter<EntityType>()).HasMaxLength(32);
            e.Property(a => a.Action).HasConversion(new EnumSnakeCaseConverter<AuditAction>()).HasMaxLength(32);
        });
    }

    private void ApplyTenantFilters(ModelBuilder mb)
    {
        mb.Entity<VehicleEntity>().HasQueryFilter(e => _tenantDealerId == null || e.DealerId == _tenantDealerId);
        mb.Entity<CustomerEntity>().HasQueryFilter(e => _tenantDealerId == null || e.DealerId == _tenantDealerId);
        mb.Entity<CustomerVehicleEntity>().HasQueryFilter(e => _tenantDealerId == null || e.DealerId == _tenantDealerId);
        mb.Entity<ListingEntity>().HasQueryFilter(e => _tenantDealerId == null || e.DealerId == _tenantDealerId);
        mb.Entity<ComplianceCheckEntity>().HasQueryFilter(e => _tenantDealerId == null || e.DealerId == _tenantDealerId);
        mb.Entity<LeadEntity>().HasQueryFilter(e => _tenantDealerId == null || e.DealerId == _tenantDealerId);
        mb.Entity<LeadNoteEntity>().HasQueryFilter(e => _tenantDealerId == null || e.DealerId == _tenantDealerId);
        mb.Entity<WorkOrderEntity>().HasQueryFilter(e => _tenantDealerId == null || e.DealerId == _tenantDealerId);
        mb.Entity<VehiclePhotoEntity>().HasQueryFilter(e => _tenantDealerId == null || e.DealerId == _tenantDealerId);
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyTimestamps();
        AutoAssignTenantId();
        BumpVersions();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken ct = default)
    {
        ApplyTimestamps();
        AutoAssignTenantId();
        BumpVersions();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
    }

    // Entities carry an int Version guarded by [ConcurrencyCheck]; EF does not advance it on its own,
    // so without this bump every stored version stays 0 and VERSION_CONFLICT can never fire.
    private void BumpVersions()
    {
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State != EntityState.Modified) continue;
            if (entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Version") is not { } version) continue;
            if (version.CurrentValue is int current) version.CurrentValue = current + 1;
        }
    }

    private void ApplyTimestamps()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Properties.FirstOrDefault(p => p.Metadata.Name == "CreatedAt") is { } created)
                    created.CurrentValue = now;
                if (entry.Properties.FirstOrDefault(p => p.Metadata.Name == "UpdatedAt") is { } updated)
                    updated.CurrentValue = now;
                if (entry.Properties.FirstOrDefault(p => p.Metadata.Name == "LinkedAt") is { } linked)
                    linked.CurrentValue = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                if (entry.Properties.FirstOrDefault(p => p.Metadata.Name == "UpdatedAt") is { } updated)
                    updated.CurrentValue = now;
            }
        }
    }

    private void AutoAssignTenantId()
    {
        var dealerId = TenantContext.Get()?.TenantDealerId;
        if (dealerId == null) return;

        foreach (var entry in ChangeTracker.Entries<ITenantOwned>())
        {
            if (entry.State == EntityState.Added && entry.Entity.DealerId == null)
                entry.Entity.DealerId = dealerId;
        }
    }
}
