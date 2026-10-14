using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Lead;

[Table("sales_lead")]
public class LeadEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("customer_id")]
    public long CustomerId { get; set; }

    [Column("vehicle_id")]
    public long? VehicleId { get; set; }

    [Column("owner_username")]
    [MaxLength(64)]
    public string? OwnerUsername { get; set; }

    [Column("stage")]
    public LeadStage Stage { get; set; } = LeadStage.New;

    [Column("next_follow_up_on")]
    public DateOnly? NextFollowUpOn { get; set; }

    [Column("lost_reason")]
    [MaxLength(300)]
    public string? LostReason { get; set; }

    [Column("version")]
    [ConcurrencyCheck]
    public int Version { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
