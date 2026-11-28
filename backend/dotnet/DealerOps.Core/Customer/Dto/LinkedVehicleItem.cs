using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Customer.Dto;

public record LinkedVehicleItem(
    long Id,
    string Vin,
    int ModelYear,
    string Make,
    string Model,
    VehicleStatus Status);
