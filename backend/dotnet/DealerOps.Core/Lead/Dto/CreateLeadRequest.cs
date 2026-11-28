using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Customer.Dto;

namespace DealerOps.Core.Lead.Dto;

public record CreateLeadRequest(
    long? CustomerId,
    CreateCustomerRequest? NewCustomer,
    long? VehicleId,
    [MaxLength(64)] string? OwnerUsername,
    DateOnly? NextFollowUpOn,
    [MaxLength(2000)] string? Note);
