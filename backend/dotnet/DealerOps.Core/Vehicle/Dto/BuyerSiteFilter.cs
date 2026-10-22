namespace DealerOps.Core.Vehicle.Dto;

/// <summary>
/// Vehicle list filter on the buyer site (design/21 SHOP-01): <c>Listed</c> when the vehicle is in
/// stock and its ad is ready with a passed check on the current version; <c>TakenDown</c> when it
/// is sold with a ready ad (the buyer site dropped it on sale); <c>NotListed</c> for the rest.
/// </summary>
public enum BuyerSiteFilter { Listed, NotListed, TakenDown }
