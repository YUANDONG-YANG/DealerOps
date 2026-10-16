using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Notifications;

/// <summary>
/// Dealer inbox: every active member of the dealership sees the same unread list, and the
/// first user who approves or rejects an item takes it off everyone else's screen. The payload
/// is forwarded as a JSON tree so the frontend can switch on <c>kind</c> without the backend
/// knowing which UI it renders.
/// </summary>
[ApiController]
[Route("api/v1/dealer/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly NotificationService _service;

    public NotificationController(NotificationService service) { _service = service; }

    [HttpGet]
    public List<NotificationResponse> List() =>
        _service.ListUnresolved().Select(ToResponse).ToList();

    private static NotificationResponse ToResponse(NotificationEntity entity)
    {
        var payload = JsonSerializer.Deserialize<JsonElement>(entity.Payload);
        return new NotificationResponse(entity.Id, entity.Kind, entity.CreatedAt, payload);
    }
}

public record NotificationResponse(long Id, string Kind, DateTime CreatedAt, JsonElement Payload);
