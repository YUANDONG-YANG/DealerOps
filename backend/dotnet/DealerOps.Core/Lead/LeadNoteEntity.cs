using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Lead;

/// <summary>An append-only note on a lead; its body is never copied into the audit trail.</summary>
[Table("sales_lead_note")]
public class LeadNoteEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("lead_id")]
    public long LeadId { get; set; }

    [Column("author_username")]
    [MaxLength(64)]
    [Required]
    public string AuthorUsername { get; set; } = "";

    [Column("body")]
    [MaxLength(2000)]
    [Required]
    public string Body { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
