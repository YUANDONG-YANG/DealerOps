using System.Text.Json.Serialization;

namespace DealerOps.Core.Vehicle;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum VehicleStatus { IN_STOCK, SOLD }
