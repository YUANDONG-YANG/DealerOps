using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Payment;

/// <summary>
/// One payment received against a sold vehicle. This is a record of money already taken at the
/// dealership (cash, cheque, a card run on the dealer's own terminal); DealerOps does not process
/// card payments.
/// </summary>
[Table("vehicle_payment")]
public class VehiclePaymentEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("vehicle_id")]
    public long VehicleId { get; set; }

    [Column("amount", TypeName = "decimal(12,2)")]
    public decimal Amount { get; set; }

    [Column("method")]
    public PaymentMethod Method { get; set; }

    [Column("paid_on")]
    public DateOnly PaidOn { get; set; }

    [Column("note")]
    [MaxLength(200)]
    public string? Note { get; set; }

    [Column("recorded_by")]
    [MaxLength(64)]
    public string RecordedBy { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    /// <summary>Set when the row is deleted; the row itself is kept (no data is destroyed).</summary>
    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }
}
