using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.WorkOrder;

[Table("work_order")]
public class WorkOrderEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("vehicle_id")]
    public long VehicleId { get; set; }

    [Column("task")]
    [MaxLength(200)]
    [Required]
    public string Task { get; set; } = "";

    [Column("assignee_username")]
    [MaxLength(64)]
    public string? AssigneeUsername { get; set; }

    [Column("status")]
    public WorkOrderStatus Status { get; set; }

    [Column("due_on")]
    public DateOnly? DueOn { get; set; }

    [Column("cost", TypeName = "decimal(12,2)")]
    public decimal? Cost { get; set; }

    [Column("completion_note")]
    [MaxLength(500)]
    public string? CompletionNote { get; set; }

    [Column("completed_on")]
    public DateOnly? CompletedOn { get; set; }

    [Column("version")]
    [ConcurrencyCheck]
    public int Version { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
