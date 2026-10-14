using System.Text.Json.Serialization;

namespace DealerOps.Core.Common;

public record ErrorBody(
    string Code,
    string Message,
    string RequestId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    Dictionary<string, string>? FieldErrors = null);
