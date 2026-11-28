namespace DealerOps.Core.Common.Tenant;

public interface ITenantOwned
{
    long? DealerId { get; set; }
}
