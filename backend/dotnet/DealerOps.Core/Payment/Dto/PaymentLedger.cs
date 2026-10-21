namespace DealerOps.Core.Payment.Dto;

/// <summary>Payments received for one sold vehicle. Balance due is sold price minus paid total.</summary>
public record PaymentLedger(decimal? SoldPrice, decimal PaidTotal, decimal? BalanceDue, List<PaymentItem> Items);

public record PaymentItem(long Id, decimal Amount, PaymentMethod Method, DateOnly PaidOn, string? Note,
    string RecordedBy, DateTime CreatedAt);
