using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DealerOps.Core.Dealer;

[Table("app_user")]
public class AppUserEntity
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("username")]
    [MaxLength(64)]
    [Required]
    public string Username { get; set; } = "";

    [Column("password_hash")]
    [MaxLength(100)]
    [Required]
    public string PasswordHash { get; set; } = "";

    [Column("display_name")]
    [MaxLength(120)]
    [Required]
    public string DisplayName { get; set; } = "";

    [Column("role")]
    [MaxLength(32)]
    [Required]
    public AppRole Role { get; set; } = AppRole.DealerUser;

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    // The dealer this account asked to join (self-service onboarding). Any active member of
    // that dealer can approve the request, which moves the user into DealerId and clears
    // this field; a reject just clears it. Always null for Platform.Admin accounts.
    [Column("requested_dealer_id")]
    public long? RequestedDealerId { get; set; }

    [Column("active")]
    public bool Active { get; set; } = true;

    [Column("email")]
    [MaxLength(254)]
    public string? Email { get; set; }

    [Column("phone")]
    [MaxLength(40)]
    public string? Phone { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
