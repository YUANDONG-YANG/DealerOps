namespace DealerOps.Core.Listing;

/// <summary>Price type the ad advertises; finance and lease ads need extra disclosures.</summary>
public enum AdKind
{
    Cash,
    Finance,
    Lease
}
