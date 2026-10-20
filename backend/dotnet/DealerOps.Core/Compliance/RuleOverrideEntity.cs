using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DealerOps.Core.Compliance;

[Table("compliance_rule_override")]
public class RuleOverrideEntity
{
    [Key]
    [Column("rule_id")]
    [MaxLength(64)]
    public string RuleId { get; set; } = "";

    [Column("enabled")]
    public bool Enabled { get; set; } = true;

    [Column("severity")]
    [MaxLength(16)]
    public string? Severity { get; set; }

    [Column("message")]
    [MaxLength(500)]
    public string? Message { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column("updated_by")]
    [MaxLength(64)]
    public string UpdatedBy { get; set; } = "";
}
