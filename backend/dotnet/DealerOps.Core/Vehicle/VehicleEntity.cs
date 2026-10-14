using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Vehicle;

[Table("vehicle")]
public class VehicleEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("vin")]
    [MaxLength(32)]
    [Required]
    public string Vin { get; set; } = "";

    [Column("make")]
    [MaxLength(80)]
    [Required]
    public string Make { get; set; } = "";

    [Column("model")]
    [MaxLength(80)]
    [Required]
    public string Model { get; set; } = "";

    [Column("model_year")]
    public int ModelYear { get; set; }

    [Column("source")]
    public VehicleSource Source { get; set; }

    [Column("purchase_cost", TypeName = "decimal(12,2)")]
    public decimal PurchaseCost { get; set; }

    [Column("added_on")]
    public DateOnly AddedOn { get; set; }

    [Column("condition_code")]
    public ConditionCode ConditionCode { get; set; }

    [Column("repair_cost", TypeName = "decimal(12,2)")]
    public decimal? RepairCost { get; set; }

    [Column("carfax_url")]
    [MaxLength(500)]
    public string? CarfaxUrl { get; set; }

    [Column("sold_on")]
    public DateOnly? SoldOn { get; set; }

    [Column("sold_price", TypeName = "decimal(12,2)")]
    public decimal? SoldPrice { get; set; }

    [Column("status")]
    public VehicleStatus Status { get; set; }

    [Column("version")]
    [ConcurrencyCheck]
    public int Version { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
