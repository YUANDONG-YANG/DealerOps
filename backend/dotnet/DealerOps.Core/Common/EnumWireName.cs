using System.Text.Json;

namespace DealerOps.Core.Common;

// The UPPER_SNAKE_CASE name an enum value has on the wire ("IN_PROGRESS"), for places that
// store or log it outside the JSON serializer, such as audit field summaries.
public static class EnumWireName
{
    public static string Of(Enum value) => JsonNamingPolicy.SnakeCaseUpper.ConvertName(value.ToString());
}
