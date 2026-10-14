using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DealerOps.Core.Common.Tenant;

namespace DealerOps.Core.Customer;

[Table("customer_vehicle")]
public class CustomerVehicleEntity : ITenantOwned
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Column("dealer_id")]
    public long? DealerId { get; set; }

    [Column("customer_id")]
    public long CustomerId { get; set; }

    [Column("vehicle_id")]
    public long VehicleId { get; set; }

    [Column("linked_at")]
    public DateTime LinkedAt { get; set; }
}
