using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DealerOps.Core.Audit;

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

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
