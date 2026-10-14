namespace DealerOps.Core.Common;

public record PageResponse<T>(List<T> Items, int Page, int Size, long TotalElements);
