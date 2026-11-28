using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Lead.Dto;

public record LeadVehicleBrief(
    long Id,
    string Vin,
    int ModelYear,
    string Make,
    string Model,
    VehicleStatus Status);
