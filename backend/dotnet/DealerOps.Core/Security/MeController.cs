using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Security;

[ApiController]
[Route("api/v1")]
[Authorize]
public class MeController : ControllerBase
{
    private readonly AppDbContext _db;

    public MeController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("me")]
    public MeResponse Me()
    {
        var user = TenantContext.Get()
                   ?? throw new ApiException(ErrorCode.Unauthorized, "Unauthorized");

        var appUser = _db.AppUsers.FirstOrDefault(u => u.Username == user.Username);
        var displayName = appUser?.DisplayName ?? "";

        if (user.Role == AppRole.PlatformAdmin)
        {
            return new MeResponse(
                user.Username, displayName, AppRole.PlatformAdmin.Value,
                null, null, null, null, null, null);
        }

        var roleValue = user.Role == AppRole.DealerUser ? AppRole.DealerUser.Value : null;
        var dealerId = user.TenantDealerId;
        DealerEntity? dealer = dealerId.HasValue
            ? _db.Dealers.Find(dealerId.Value)
            : null;

        return new MeResponse(
            user.Username, displayName, roleValue, dealerId,
            dealer?.LegalName, dealer?.ContactPhone,
            dealer?.ContactEmail, dealer?.ContactAddress,
            dealer?.LogoDataUrl);
    }
}
