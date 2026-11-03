using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DealerOps.Core.Dealer;

/// <summary>A dealership tenant: legal name, contact details, optional logo and active flag.</summary>
[Table("dealer")]
public class DealerEntity
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("legal_name")]
    [MaxLength(200)]
    [Required]
    public string LegalName { get; set; } = "";

    [Column("contact_phone")]
    [MaxLength(40)]
    [Required]
    public string ContactPhone { get; set; } = "";

    [Column("contact_email")]
    [MaxLength(120)]
    [Required]
    public string ContactEmail { get; set; } = "";

    [Column("contact_address")]
    [MaxLength(300)]
    [Required]
    public string ContactAddress { get; set; } = "";

    [Column("logo_data_url", TypeName = "MEDIUMTEXT")]
    public string? LogoDataUrl { get; set; }

    [Column("active")]
    public bool Active { get; set; } = true;

    [Column("version")]
    [ConcurrencyCheck]
    public int Version { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // Soft delete by the platform admin: the row stays so sale and audit history keep their
    // dealership. A deleted dealership is also inactive and has no active members.
    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }
}
