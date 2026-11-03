namespace DealerOps.Core.Customer.Dto;

/// <summary>Fields that match another customer of this dealership: name, email, phone, homeAddress.</summary>
public record CustomerDuplicatesResponse(List<string> Fields);
