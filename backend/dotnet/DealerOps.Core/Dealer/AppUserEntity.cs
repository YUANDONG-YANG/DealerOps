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

    // Google identity claims (openid email profile). Captured on sign-in so later renames in
    // Google reflect automatically, and so a user who changes their Google email keeps the
    // same account via the stable Subject id (google_sub) instead of being treated as new.
    [Column("google_sub")]
    [MaxLength(64)]
    public string? GoogleSub { get; set; }

    // Firebase Authentication's stable user id for email/password accounts.
    [Column("firebase_uid")]
    [MaxLength(128)]
    public string? FirebaseUid { get; set; }

    [Column("given_name")]
    [MaxLength(120)]
    public string? GivenName { get; set; }

    [Column("family_name")]
    [MaxLength(120)]
    public string? FamilyName { get; set; }

    [Column("avatar_url", TypeName = "TEXT")]
    public string? AvatarUrl { get; set; }

    [Column("locale")]
    [MaxLength(16)]
    public string? Locale { get; set; }
}
