using DealerOps.Core.Dealer;

namespace DealerOps.Core.Common.Tenant;

public record CurrentUser(string Username, AppRole? Role, long? TenantDealerId);
