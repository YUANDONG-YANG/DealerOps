using DealerOps.Core.Dealer;

namespace DealerOps.Core.Common.Tenant;

/// <param name="DealerRole">The caller's role inside the bound dealership; null for the admin and unbound users.</param>
public record CurrentUser(string Username, AppRole? Role, long? TenantDealerId, DealerRole? DealerRole = null);
