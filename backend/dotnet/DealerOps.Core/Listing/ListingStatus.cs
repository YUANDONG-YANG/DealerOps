namespace DealerOps.Core.Listing;

/// <summary>DRAFT until a passed check is confirmed with the READY mark; any content edit returns it to DRAFT.</summary>
public enum ListingStatus
{
    Draft,
    Ready
}
