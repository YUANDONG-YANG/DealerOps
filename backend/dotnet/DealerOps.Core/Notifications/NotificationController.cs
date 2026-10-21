using System.Text.Json;
using System.Text.Json.Nodes;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Notifications;

/// <summary>
/// Dealer inbox: managers see join requests (AUTH-27) and every member sees buyer-site inquiries.
/// The first member who handles an item takes it off everyone else's screen. The payload
/// is forwarded as a JSON tree so the frontend can switch on <c>kind</c> without the backend
/// knowing which UI it renders.
/// </summary>
[ApiController]
[Route("api/v1/dealer/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly NotificationService _service;
    private readonly AppDbContext _db;

    public NotificationController(NotificationService service, AppDbContext db)
    {
        _service = service;
        _db = db;
    }

    /// <summary>
    /// Lists the dealership's notifications, newest first. includeResolved=false (default) is the
    /// inbox feed; includeResolved=true is the message history page. Both are scoped to the
    /// caller's tenant by the service layer.
    /// </summary>
    [HttpGet]
    public List<NotificationResponse> List([FromQuery] bool includeResolved = false)
    {
        var rows = _service.List(includeResolved)
            .Select(n => (entity: n, payload: JsonNode.Parse(n.Payload) as JsonObject ?? new JsonObject()))
            .ToList();

        // A join request also shows how the applicant's account was created (Google, email
        // sign-up, registration form or admin), read live so older requests get it too.
        var applicants = rows.Where(r => r.entity.Kind == "JOIN_REQUEST")
            .Select(r => r.payload["username"]?.GetValue<string>())
            .OfType<string>();
        var sources = AccountSource.For(_db, applicants);
        foreach (var (entity, payload) in rows)
        {
            if (entity.Kind == "JOIN_REQUEST" && payload["username"]?.GetValue<string>() is { } username)
                payload["source"] = sources.GetValueOrDefault(username);
        }

        return rows.Select(r => new NotificationResponse(
            r.entity.Id, r.entity.Kind, r.entity.CreatedAt, JsonSerializer.SerializeToElement(r.payload),
            r.entity.ResolvedAt, r.entity.ResolvedBy, r.entity.ResolvedAction)).ToList();
    }
}

public record NotificationResponse(
    long Id,
    string Kind,
    DateTime CreatedAt,
    JsonElement Payload,
    DateTime? ResolvedAt,
    string? ResolvedBy,
    string? ResolvedAction);
