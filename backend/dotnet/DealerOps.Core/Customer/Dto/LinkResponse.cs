namespace DealerOps.Core.Customer.Dto;

public record LinkResponse(long Id, long CustomerId, long VehicleId, DateTime LinkedAt);
