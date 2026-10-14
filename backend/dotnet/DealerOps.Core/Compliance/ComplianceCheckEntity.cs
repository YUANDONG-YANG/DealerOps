using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Compliance;

[Table("compliance_check")]
public class ComplianceCheckEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("listing_id")]
    public long ListingId { get; set; }

    [Column("content_version")]
    public int ContentVersion { get; set; }

    [Column("rule_findings", TypeName = "JSON")]
    [Required]
    public string RuleFindingsJson { get; set; } = "[]";

    [Column("ai_status")]
    public AiStatus AiStatus { get; set; }

    [Column("ai_notes", TypeName = "JSON")]
    public string? AiNotes { get; set; }

    [Column("recommendation")]
    public Recommendation Recommendation { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
