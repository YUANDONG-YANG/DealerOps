using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DealerOps.Core.Notifications;

/// <summary>
/// In-app message addressed to a whole dealership. Every active member of
/// <see cref="DealerId"/> sees it in their inbox until any one of them resolves it; after that
/// the row stays as audit history but no longer surfaces as unread. Kind is a short enum-style
/// slug (e.g. <c>JOIN_REQUEST</c>) so the frontend can pick which approve/reject verbs apply;
/// <see cref="Payload"/> is the kind-specific JSON (username, email, display name, …).
/// </summary>
[Table("notification")]
public class NotificationEntity
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long DealerId { get; set; }

    [Column("kind")]
    [MaxLength(32)]
    [Required]
    public string Kind { get; set; } = "";

    [Column("payload", TypeName = "TEXT")]
    [Required]
    public string Payload { get; set; } = "{}";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("resolved_at")]
    public DateTime? ResolvedAt { get; set; }

    [Column("resolved_by")]
    [MaxLength(64)]
    public string? ResolvedBy { get; set; }

    [Column("resolved_action")]
    [MaxLength(32)]
    public string? ResolvedAction { get; set; }
}
