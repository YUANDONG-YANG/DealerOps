using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Dealer.Dto;

public record SetDealerRoleRequest([Required] DealerRole? DealerRole);
