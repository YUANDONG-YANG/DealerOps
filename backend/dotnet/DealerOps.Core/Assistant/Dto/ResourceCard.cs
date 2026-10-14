using System.Text.Json.Serialization;

namespace DealerOps.Core.Assistant.Dto;

public record ResourceCard(
    string Kind,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] long? Id,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Label,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Status,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] long? VehicleId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? CheckStatus);
