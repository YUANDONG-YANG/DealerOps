using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Listing;

[Table("listing")]
public class ListingEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("vehicle_id")]
    public long VehicleId { get; set; }

    [Column("title")]
    [MaxLength(200)]
    public string Title { get; set; } = "";

    [Column("body", TypeName = "TEXT")]
    public string Body { get; set; } = "";

    [Column("ad_kind")]
    public AdKind AdKind { get; set; }

    [Column("medium")]
    public AdMedium Medium { get; set; }

    [Column("status")]
    public ListingStatus Status { get; set; }

    [Column("content_version")]
    public int ContentVersion { get; set; } = 1;

    [Column("last_check_id")]
    public long? LastCheckId { get; set; }

    [Column("version")]
    [ConcurrencyCheck]
    public int Version { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
