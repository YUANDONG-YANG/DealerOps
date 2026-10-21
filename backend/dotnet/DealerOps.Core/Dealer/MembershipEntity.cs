using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DealerOps.Core.Dealer;

/// <summary>
/// A login's staff membership at one dealership. Unbinding sets <c>Active</c> to false and keeps
/// the row, so the history of who worked where stays traceable.
/// </summary>
[Table("membership")]
public class MembershipEntity
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long DealerId { get; set; }

    [Column("username")]
    [MaxLength(64)]
    [Required]
    public string Username { get; set; } = "";

    [Column("active")]
    public bool Active { get; set; } = true;

    [Column("dealer_role")]
    public DealerRole DealerRole { get; set; } = DealerRole.Staff;

    [Column("created_by")]
    [MaxLength(64)]
    [Required]
    public string CreatedBy { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
