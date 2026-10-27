using DealerOps.Core.Common;
using DealerOps.Core.Customer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Customer;

/// <summary>Dealership customer CRUD; customers are listed newest first.</summary>
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

    /// <summary>Filtered page of this dealership's customers, newest first.</summary>
    [HttpGet]
    public PageResponse<CustomerListItem> List(
        [FromQuery] string? q,
        [FromQuery] bool? linked,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10)
    {
        return _service.List(q, linked, page, size);
    }

    /// <summary>Creates a customer; returns 201 with the customer detail.</summary>
    [HttpPost]
    [ProducesResponseType(201)]
    public IActionResult Create([FromBody] CreateCustomerRequest body)
    {
        return StatusCode(201, _service.Create(body));
    }

    /// <summary>One customer with its linked vehicles, newest link first.</summary>
    [HttpGet("{id}")]
    public CustomerDetail Get(long id) => _service.Get(id);

    /// <summary>Updates a customer under optimistic locking.</summary>
    [HttpPatch("{id}")]
    public CustomerDetail Patch(long id, [FromBody] PatchCustomerRequest body)
    {
        return _service.Patch(id, body);
    }

    /// <summary>Soft-deletes a customer; returns 204.</summary>
    [HttpDelete("{id}")]
    public IActionResult Delete(long id)
    {
        _service.Delete(id);
        return NoContent();
    }
}
