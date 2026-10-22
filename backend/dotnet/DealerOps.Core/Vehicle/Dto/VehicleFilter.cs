using DealerOps.Core.Listing;

namespace DealerOps.Core.Vehicle.Dto;

public record VehicleFilter(
    string? Q,
    VehicleStatus? Status,
    ConditionCode? Condition,
    VehicleBodyType? BodyType,
    string? Make,
    string? Model,
    int? ModelYear,
    bool UnlinkedOnly = false,
    AdKind? AdKind = null,
    AdMedium? Medium = null,
    string? CheckStatus = null,
    BuyerSiteFilter? BuyerSite = null);
