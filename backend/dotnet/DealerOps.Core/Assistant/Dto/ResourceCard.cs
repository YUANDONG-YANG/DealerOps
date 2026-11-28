using System.Text.Json.Serialization;

namespace DealerOps.Core.Assistant.Dto;

/// <summary>One record the assistant found: VEHICLE, CUSTOMER or LISTING, with no cost or contact data.</summary>
/// <param name="Status">Vehicle status for a VEHICLE card.</param>
/// <param name="VehicleId">The advertised vehicle for a LISTING card.</param>
/// <param name="CheckStatus">Derived compliance check status for a LISTING card.</param>
public record ResourceCard(
    string Kind,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] long? Id,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Label,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Status,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] long? VehicleId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? CheckStatus);
