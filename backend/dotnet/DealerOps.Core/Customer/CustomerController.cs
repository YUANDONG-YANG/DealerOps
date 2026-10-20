using DealerOps.Core.Common;
using DealerOps.Core.Customer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Customer;

[ApiController]
[Route("api/v1/customers")]
[Authorize]
public class CustomerController : ControllerBase
{
    private readonly CustomerService _service;

    public CustomerController(CustomerService service)
    {
        _service = service;
    }

    [HttpGet]
    public PageResponse<CustomerListItem> List(
        [FromQuery] string? q,
        [FromQuery] bool? linked,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10)
    {
        return _service.List(q, linked, page, size);
    }

    [HttpPost]
    [ProducesResponseType(201)]
    public IActionResult Create([FromBody] CreateCustomerRequest body)
    {
        return StatusCode(201, _service.Create(body));
    }

    [HttpGet("{id}")]
    public CustomerDetail Get(long id) => _service.Get(id);

    [HttpPatch("{id}")]
    public CustomerDetail Patch(long id, [FromBody] PatchCustomerRequest body)
    {
        return _service.Patch(id, body);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(long id)
    {
        _service.Delete(id);
        return NoContent();
    }
}
