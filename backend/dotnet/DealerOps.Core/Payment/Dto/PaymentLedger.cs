namespace DealerOps.Core.Payment.Dto;

/// <summary>Payments received for one sold vehicle. Balance due is sold price minus paid total.</summary>
/// <param name="SoldPrice">The vehicle's sold price; null while the vehicle is not sold.</param>
/// <param name="PaidTotal">Sum of all recorded payments.</param>
/// <param name="BalanceDue">Sold price minus paid total; null while the vehicle is not sold.</param>
/// <param name="Items">The payments, newest paid date first (then newest id).</param>
public record PaymentLedger(decimal? SoldPrice, decimal PaidTotal, decimal? BalanceDue, List<PaymentItem> Items);

/// <summary>One recorded payment.</summary>
/// <param name="RecordedBy">Username of the dealer user who recorded the payment.</param>
/// <param name="CreatedAt">When the payment was recorded (UTC).</param>
public record PaymentItem(long Id, decimal Amount, PaymentMethod Method, DateOnly PaidOn, string? Note,
    string RecordedBy, DateTime CreatedAt);
