namespace DealerOps.Core.Dealer.Dto;

/// <summary>
/// Outcome of the admin create-member or bind action: <see cref="Member"/> when the login was bound
/// directly (201), otherwise <see cref="JoinRequest"/> (202).
/// </summary>
public record AddMemberResult(MemberResponse? Member, JoinRequestSentResponse? JoinRequest);

/// <summary>A join request the admin filed for the login; the dealership owner approves it.</summary>
public record JoinRequestSentResponse(string Username, long DealerId, bool JoinRequested, string Message);
