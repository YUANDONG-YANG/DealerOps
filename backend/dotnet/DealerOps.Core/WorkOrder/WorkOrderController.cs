using DealerOps.Core.WorkOrder.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.WorkOrder;

/// <summary>Work-order endpoints for dealership users (design/14 §4.7).</summary>
[ApiController]
[Authorize]
public class WorkOrderController : ControllerBase
{
    private readonly WorkOrderService _service;

    public WorkOrderController(WorkOrderService service)
    {
        _service = service;
    }

    /// <summary>Lists a vehicle's work orders, open first, each group newest first.</summary>
    [HttpGet("api/v1/vehicles/{vehicleId}/work-orders")]
    public List<WorkOrderResponse> List(long vehicleId)
    {
        return _service.List(vehicleId);
    }

    /// <summary>Creates an open work order on an in-stock vehicle.</summary>
    [HttpPost("api/v1/vehicles/{vehicleId}/work-orders")]
    [ProducesResponseType(201)]
    public IActionResult Create(long vehicleId, [FromBody] CreateWorkOrderRequest body)
    {
        return StatusCode(201, _service.Create(vehicleId, body));
    }

    /// <summary>Returns the dealership's workshop settlement report.</summary>
    [HttpGet("api/v1/work-orders/report/settlement")]
    public WorkshopSettlementReport Settlement() => _service.Settlement();

    /// <summary>Replaces the editable state of an open work order.</summary>
    [HttpPatch("api/v1/work-orders/{id}")]
    public WorkOrderResponse Patch(long id, [FromBody] PatchWorkOrderRequest body)
    {
        return _service.Patch(id, body);
    }
}
