using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Photo;

/// <summary>
/// A vehicle photo row holding the uploaded original and, after enhancement, a JPEG variant with the
/// preset that produced it. Image bytes stay in this table and are never copied into audit rows.
/// </summary>
[Table("vehicle_photo")]
public class VehiclePhotoEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("vehicle_id")]
    public long VehicleId { get; set; }

    [Column("content_type")]
    [MaxLength(32)]
    [Required]
    public string ContentType { get; set; } = "";

    [Column("original_data", TypeName = "MEDIUMBLOB")]
    [Required]
    public byte[] OriginalData { get; set; } = [];

    [Column("enhanced_data", TypeName = "MEDIUMBLOB")]
    public byte[]? EnhancedData { get; set; }

    [Column("enhancement")]
    public PhotoPreset? Enhancement { get; set; }

    [Column("uploaded_by")]
    [MaxLength(64)]
    [Required]
    public string UploadedBy { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    /// <summary>Set when the row is deleted; the row itself is kept (no data is destroyed).</summary>
    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }
}
