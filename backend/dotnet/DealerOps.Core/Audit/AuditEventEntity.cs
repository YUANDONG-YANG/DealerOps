using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DealerOps.Core.Audit;

/// <summary>
/// One append-only audit row (AUD-05): who did what to which record, when and from where.
/// FieldSummary holds the new values of the changed fields; PreviousValues holds the values they
/// replaced, so each row is one traceable version step, contact values included (AUD-04).
/// </summary>
[Table("audit_event")]
public class AuditEventEntity
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("actor_username")]
    [MaxLength(64)]
    [Required]
    public string ActorUsername { get; set; } = "";

    [Column("entity_type")]
    public EntityType EntityType { get; set; }

    [Column("entity_id")]
    public long EntityId { get; set; }

    [Column("action")]
    public AuditAction Action { get; set; }

    [Column("field_summary", TypeName = "JSON")]
    public string? FieldSummary { get; set; }

    [Column("previous_values", TypeName = "JSON")]
    public string? PreviousValues { get; set; }

    /// <summary>Source address of the request that caused the change; null for background jobs.</summary>
    [Column("client_ip")]
    [MaxLength(45)]
    public string? ClientIp { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
