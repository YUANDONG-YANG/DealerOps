using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DealerOps.Core.Dealer;

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

    [Column("created_by")]
    [MaxLength(64)]
    [Required]
    public string CreatedBy { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
