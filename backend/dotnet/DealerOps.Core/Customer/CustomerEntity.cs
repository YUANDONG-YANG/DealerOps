using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Customer;

/// <summary>A dealership customer; soft-deleted through <see cref="DeletedAt"/> (CRM-14).</summary>
[Table("customer")]
public class CustomerEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("name")]
    [MaxLength(160)]
    [Required]
    public string Name { get; set; } = "";

    [Column("email")]
    [MaxLength(254)]
    [Required]
    public string Email { get; set; } = "";

    [Column("phone")]
    [MaxLength(40)]
    [Required]
    public string Phone { get; set; } = "";

    [Column("home_address")]
    [MaxLength(300)]
    [Required]
    public string HomeAddress { get; set; } = "";

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
