namespace DealerOps.Core.Vehicle;

/// <summary>Condition disclosure of a vehicle; a change returns its listing to DRAFT for a new compliance check.</summary>
public enum ConditionCode
{
    Certified,
    AsIs,
    Unfit,
    Irreparable
}
