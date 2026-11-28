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

    /// <summary>The user's own source name when <see cref="Source"/> is Other (DMS-19); null otherwise.</summary>
    [Column("source_other")]
    [MaxLength(100)]
    public string? SourceOther { get; set; }

    /// <summary>Name of the person or business the vehicle was acquired from, for any source (DMS-20).</summary>
    [Column("acquired_from_name")]
    [MaxLength(120)]
    public string? AcquiredFromName { get; set; }

    /// <summary>Address of the person or business the vehicle was acquired from (DMS-20).</summary>
    [Column("acquired_from_address")]
    [MaxLength(255)]
    public string? AcquiredFromAddress { get; set; }

    [Column("purchase_cost", TypeName = "decimal(12,2)")]
    public decimal PurchaseCost { get; set; }

    [Column("added_on")]
    public DateOnly AddedOn { get; set; }

    [Column("condition_code")]
    public ConditionCode ConditionCode { get; set; }

    [Column("body_type")]
    public VehicleBodyType BodyType { get; set; } = VehicleBodyType.Other;

    [Column("repair_cost", TypeName = "decimal(12,2)")]
    public decimal? RepairCost { get; set; }

    [Column("carfax_url")]
    [MaxLength(500)]
    public string? CarfaxUrl { get; set; }

    [Column("mileage_km")]
    public int? MileageKm { get; set; }

    [Column("exterior_color")]
    [MaxLength(40)]
    public string? ExteriorColor { get; set; }

    [Column("fuel_type")]
    public FuelType? FuelType { get; set; }

    [Column("stock_number")]
    [MaxLength(20)]
    public string? StockNumber { get; set; }

    [Column("list_price", TypeName = "decimal(12,2)")]
    public decimal? ListPrice { get; set; }

    [Column("sold_on")]
    public DateOnly? SoldOn { get; set; }

    [Column("sold_price", TypeName = "decimal(12,2)")]
    public decimal? SoldPrice { get; set; }

    /// <summary>Username of the member who recorded the sale.</summary>
    [Column("sold_by")]
    [MaxLength(64)]
    public string? SoldBy { get; set; }

    /// <summary>Typed buyer name when the sale is to "Other" rather than a CRM customer.</summary>
    [Column("sold_to_name")]
    [MaxLength(120)]
    public string? SoldToName { get; set; }

    [Column("status")]
    public VehicleStatus Status { get; set; }

    [Column("version")]
    [ConcurrencyCheck]
    public int Version { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }
}
