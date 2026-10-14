using DealerOps.Core.WorkOrder.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.WorkOrder;

[ApiController]
[Authorize]
public class WorkOrderController : ControllerBase
{
    private readonly WorkOrderService _service;

    public WorkOrderController(WorkOrderService service)
    {
        _service = service;
    }

    [HttpGet("api/v1/vehicles/{vehicleId}/work-orders")]
    public List<WorkOrderResponse> List(long vehicleId)
    {
        return _service.List(vehicleId);
    }

    [HttpPost("api/v1/vehicles/{vehicleId}/work-orders")]
    [ProducesResponseType(201)]
    public IActionResult Create(long vehicleId, [FromBody] CreateWorkOrderRequest body)
    {
        return StatusCode(201, _service.Create(vehicleId, body));
    }

    [HttpPatch("api/v1/work-orders/{id}")]
    public WorkOrderResponse Patch(long id, [FromBody] PatchWorkOrderRequest body)
    {
        return _service.Patch(id, body);
    }
}
