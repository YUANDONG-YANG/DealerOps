using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer.Dto;
using DealerOps.Core.Notifications;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Dealer;

/// <summary>
/// Dealership memberships: the admin binds, unbinds, sets any role (owner included) and resets
/// passwords, and inside a dealership the owner and managers remove members, change their roles
/// and edit their full name and phone within their own scope. Every change is audited on
/// MEMBERSHIP or APP_USER in the same unit of work as the change (AUD-07).
/// </summary>
public class MembershipService
{
    private readonly AppDbContext _db;
    private readonly NewAccountRules _accountRules;
    private readonly IAuditService _audit;
    private readonly NotificationService _notifications;
    private readonly JoinRequestService _joinRequests;
    private readonly ILogger<MembershipService> _logger;

    /// <summary>Message returned when the admin's create-member or bind action files a join request.</summary>
    public const string JoinRequestSentMessage =
        "Join request sent to the dealership. The owner approves it in Team > Join Requests.";

    /// <summary>Message returned when an action would leave a dealership that still has staff without an owner.</summary>
    public const string LastOwnerMessage =
        "This is the dealership's only owner. Appoint another owner before demoting or removing this member.";

    public MembershipService(AppDbContext db, NewAccountRules accountRules, IAuditService audit,
        NotificationService notifications, JoinRequestService joinRequests, ILogger<MembershipService> logger)
    {
        _db = db;
        _accountRules = accountRules;
        _audit = audit;
        _notifications = notifications;
        _joinRequests = joinRequests;
        _logger = logger;
    }

    /// <summary>
    /// Admin staff list of one dealership, active and unbound members alike, newest membership
    /// first. <paramref name="q"/> matches name, username, email or phone.
    /// </summary>
    public PageResponse<MemberResponse> List(long dealerId, string? q, int page, int size)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);

        var all = _db.Memberships
            .Where(m => m.DealerId == dealerId)
            .OrderByDescending(m => m.CreatedAt)
            .ThenByDescending(m => m.Id)
            .ToList()
            .Select(m => (Membership: m, User: _db.AppUsers.FirstOrDefault(u => u.Username == m.Username)))
            // A deleted account (A6) leaves the list; its membership row stays for history.
            .Where(x => x.User == null || x.User.Active)
            .Select(x =>
            {
                var (m, user) = x;
                return new MemberResponse(m.Username, user?.DisplayName ?? "", AppRole.DealerUser.Value, m.Active,
                    SignInMethod(user), user?.Email, user?.Phone, m.DealerRole);
            })
            .Where(item => Matches(item, q))
            .ToList();

        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        var from = Math.Min(p * s, all.Count);
        var to = Math.Min(from + s, all.Count);
        return new PageResponse<MemberResponse>(all.GetRange(from, to - from), p, s, all.Count);
    }

    private static ApiException DuplicateMember(string username, string message) =>
        new(ErrorCode.DupMember, message, new Dictionary<string, string> { ["username"] = message });

    /// <summary>
    /// The admin's create-member and bind action, creating the login first when the username is
    /// new. A login is active staff at one dealership at most (AUTH-03). While the dealership has
    /// no active owner the login is bound directly as its first owner, because an empty dealership
    /// has nobody who could approve a join request; after that a join request is filed that the
    /// dealership owner approves (AUTH-28).
    /// </summary>
    /// <param name="dealerId">The dealership that gains the member.</param>
    /// <param name="body">The login to bind. A password is required only when the login is new, and it is never logged.</param>
    /// <returns>The bound member, or the join request that was filed instead.</returns>
    /// <exception cref="ApiException">Forbidden when the caller is not the platform admin, NotFound when the dealership is missing, or a conflict when the login cannot be bound.</exception>
    public AddMemberResult Add(long dealerId, CreateMemberRequest body)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        var username = body.Username.Trim();

        var existing = _db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (existing != null && existing.Role == AppRole.PlatformAdmin)
        {
            _logger.LogWarning(
                "Member bind rejected dealerId={DealerId} username={Username} reason={Reason} outcome={Outcome} by {Actor}",
                dealerId, username, "platform_admin", "dup_member", TenantContext.ActorUsername());
            throw DuplicateMember(username,
                $"'{username}' is the platform admin account and cannot be dealership staff. Choose a different username.");
        }

        // Admin-only endpoint, so naming the other dealership reveals nothing across tenants and
        // tells the admin exactly where the login already lives (AUTH-03: one login, one dealership).
        var activeAt = _db.Memberships.Where(m => m.Username == username && m.Active)
            .Join(_db.Dealers, m => m.DealerId, d => d.Id, (m, d) => new { d.Id, d.LegalName })
            .FirstOrDefault();
        if (activeAt != null)
            throw DuplicateMember(username, activeAt.Id == dealerId
                ? $"'{username}' is already active staff at {activeAt.LegalName}. It is listed in this dealership's staff table."
                : $"'{username}' is already active staff at {activeAt.LegalName}. A login can belong to only one dealership: "
                  + $"choose a different username, or unbind '{username}' from {activeAt.LegalName} first.");

        NewAccountRules.Contact? contact = null;
        if (existing == null)
        {
            RequireNewUserFields(body);
            contact = _accountRules.CanonicalContact(body.Email, body.Phone);
            _accountRules.RequireAvailable(username, contact);
        }

        // One transaction from the bootstrap decision through the membership row and its audit
        // entry (AUD-07): the flush further down only assigns the id, so nothing is committed
        // until the audit row is written too. The dealership row is locked first, the way the
        // payment ledger locks the vehicle, so two admin binds arriving at the same time cannot
        // both read "no active owner" and both become owner (one active owner per dealership,
        // design/15 §2.5). It must be the transaction's first read: MySQL takes the snapshot for
        // the reads below only after the lock is granted.
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;
        _db.Database.ExecuteSqlInterpolated($"SELECT id FROM dealer WHERE id = {dealerId} FOR UPDATE");

        if (_db.Memberships.Any(m => m.DealerId == dealerId && m.Active && m.DealerRole == DealerRole.Owner))
        {
            var filed = RequestJoin(dealerId, username, body, existing, contact);
            tx?.Commit();
            return new AddMemberResult(null, filed);
        }

        var membership = _db.Memberships
            .FirstOrDefault(m => m.DealerId == dealerId && m.Username == username)
            ?? new MembershipEntity();

        membership.DealerId = dealerId;
        membership.Username = username;
        membership.Active = true;
        // A direct bind only happens while the dealership has no active owner, so it bootstraps
        // the first owner (AUTH-28). Later members join as sales through a join request the owner
        // approves, and only the platform admin can appoint another owner.
        membership.DealerRole = DealerRole.Owner;
        membership.CreatedBy = TenantContext.ActorUsername();

        if (membership.Id == 0)
            _db.Memberships.Add(membership);
        _db.SaveChanges();

        AppUserEntity user;
        Dictionary<string, object?>? previousLogin = null;
        if (existing == null)
        {
            user = new AppUserEntity
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password!),
                DisplayName = body.DisplayName!.Trim(),
                Email = contact!.Email,
                Phone = contact.Phone,
                Role = AppRole.DealerUser,
                DealerId = dealerId,
                Active = true
            };
            _db.AppUsers.Add(user);
        }
        else
        {
            user = existing;
            previousLogin = new Dictionary<string, object?>
            {
                ["dealerId"] = user.DealerId, ["active"] = user.Active, ["requestedDealerId"] = user.RequestedDealerId
            };
            user.Role = AppRole.DealerUser;
            user.DealerId = dealerId;
            user.Active = true;
            // An admin bind settles any pending join request, so it cannot resurface in that
            // dealership's queue after a later unbind.
            if (user.RequestedDealerId is { } requested)
            {
                user.RequestedDealerId = null;
                _notifications.ResolveByCorrelation(requested, "JOIN_REQUEST", "username", username,
                    requested == dealerId ? "APPROVED" : "CANCELLED", TenantContext.ActorUsername());
            }
        }

        try { _db.SaveChanges(); }
        catch (DbUpdateException ex) { ThrowConflict(ex, dealerId, user.Id); }

        // First creation of the login (AUTH-22). The actor is the new username. The password
        // is never written into the summary. The membership row below stays as well.
        if (existing == null)
            _audit.Record("APP_USER", user.Id, "CREATE", null, username,
                new Dictionary<string, object> { ["username"] = username, ["registration"] = "admin" });
        else
            // An existing login is moved into this dealership: record the account-level change too.
            _audit.Record("APP_USER", user.Id, "UPDATE", dealerId, TenantContext.ActorUsername(),
                new Dictionary<string, object>
                {
                    ["username"] = username, ["dealerId"] = dealerId, ["active"] = true, ["requestedDealerId"] = ""
                },
                previousLogin);

        _audit.Record("MEMBERSHIP", membership.Id, "CREATE", dealerId, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["dealerRole"] = EnumWireName.Of(membership.DealerRole) });
        _db.SaveChanges();
        tx?.Commit();
        _logger.LogInformation("Member bound dealerId={DealerId} username={Username} newLogin={NewLogin} by {Actor}",
            dealerId, username, existing == null, TenantContext.ActorUsername());

        return new AddMemberResult(new MemberResponse(membership.Username, user.DisplayName, AppRole.DealerUser.Value,
            membership.Active, SignInMethod(user), user.Email, user.Phone, membership.DealerRole), null);
    }

    /// <summary>
    /// Files the admin's join request for a dealership that already has an owner, creating the
    /// login first when it is new (decision D3). Nothing is bound: the owner approves or rejects
    /// the request in Team &gt; Join Requests, and the member then joins as sales (AUTH-28).
    /// </summary>
    private JoinRequestSentResponse RequestJoin(long dealerId, string username, CreateMemberRequest body,
        AppUserEntity? existing, NewAccountRules.Contact? contact)
    {
        var actor = TenantContext.ActorUsername();
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;

        var user = existing;
        if (user == null)
        {
            user = new AppUserEntity
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password!),
                DisplayName = body.DisplayName!.Trim(),
                Email = contact!.Email,
                Phone = contact.Phone,
                Role = AppRole.DealerUser,
                Active = true
            };
            _db.AppUsers.Add(user);
            try { _db.SaveChanges(); }
            catch (DbUpdateException ex) { ThrowConflict(ex, dealerId, 0); }
            // First creation of the login (AUTH-22). The actor is the new username, as in a bind.
            _audit.Record("APP_USER", user.Id, "CREATE", null, username,
                new Dictionary<string, object> { ["username"] = username, ["registration"] = "admin" });
        }
        else if (!user.Active || user.DealerId != null)
        {
            _audit.Record("APP_USER", user.Id, "UPDATE", dealerId, actor,
                new Dictionary<string, object> { ["username"] = username, ["active"] = true, ["dealerId"] = "" },
                new Dictionary<string, object?> { ["active"] = user.Active, ["dealerId"] = user.DealerId });
            user.Active = true;
            user.DealerId = null;
        }

        _joinRequests.SetRequested(user, dealerId, actor);
        _db.SaveChanges();
        tx?.Commit();
        _logger.LogInformation("Admin join request filed dealerId={DealerId} username={Username} newLogin={NewLogin} by {Actor}",
            dealerId, username, existing == null, actor);
        return new JoinRequestSentResponse(username, dealerId, true, JoinRequestSentMessage);
    }

    /// <summary>
    /// The platform admin sets any role, owner included (AUTH-26). This is how a dealership's
    /// owner is replaced when one leaves; nobody inside the dealership can appoint an owner.
    /// Setting OWNER transfers the office: the sitting owner is demoted to MANAGER in the same
    /// transaction, so the dealership keeps exactly one active owner.
    /// </summary>
    public void SetRole(long dealerId, string username, DealerRole role)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        ChangeRole(dealerId, username, role);
    }

    /// <summary>
    /// The owner or a manager sets another member of their own dealership to Manager or Sales
    /// (AUTH-27). Nobody changes their own role, and nobody inside the dealership sets OWNER or
    /// acts on the owner: the owner is appointed by the platform admin only. An owner may act on
    /// any member below owner; a manager only on a sales member, which is the promotion of a sales
    /// member to manager.
    /// </summary>
    public void SetRoleInOwnDealership(string username, DealerRole role)
    {
        var caller = TenantGuard.RequireTeamAccess();
        var tenant = caller.TenantDealerId!.Value;
        if (string.Equals(caller.Username, username, StringComparison.OrdinalIgnoreCase))
            throw DenyMemberAction(tenant, username, "own_role", "You cannot change your own role.");
        if (role == DealerRole.Owner)
            throw DenyMemberAction(tenant, username, "set_owner",
                "Only the platform admin can appoint a dealership owner.");

        var membership = ActiveMembership(tenant, username);
        RequireActsOn(caller, membership, tenant,
            ownerTarget: "Only the platform admin can change the dealership owner.",
            managerTarget: "Only the dealership owner can change a manager's role.");
        ChangeRole(tenant, username, role);
    }

    /// <summary>
    /// The owner or a manager edits the full name and phone of a member of their own dealership
    /// (AUTH-27). An owner edits any member below owner; a manager edits sales members only. The
    /// phone stays unique across accounts because it is also a sign-in name.
    /// </summary>
    public void UpdateInOwnDealership(string username, PatchMemberRequest body)
    {
        var caller = TenantGuard.RequireTeamAccess();
        var tenant = caller.TenantDealerId!.Value;
        RequireActsOn(caller, ActiveMembership(tenant, username), tenant,
            ownerTarget: "The dealership owner's own details are edited in Profile.",
            managerTarget: "Only the dealership owner can edit a manager's details.");
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        var displayName = body.DisplayName.Trim();
        var phone = string.IsNullOrWhiteSpace(body.Phone) ? null : LoginIdentifiers.Phone(body.Phone);
        if (phone != null && _db.AppUsers.Any(u => u.Id != user.Id && u.Phone == phone))
            throw new ApiException(ErrorCode.PhoneTaken, "That phone number is already registered.",
                new Dictionary<string, string> { ["phone"] = "That phone number is already registered." });

        var summary = new Dictionary<string, object> { ["username"] = username };
        var previous = new Dictionary<string, object?>();
        if (user.DisplayName != displayName)
        {
            summary["displayName"] = displayName;
            previous["displayName"] = user.DisplayName;
        }
        if (user.Phone != phone)
        {
            summary["phone"] = (object?)phone ?? "";
            previous["phone"] = user.Phone;
        }
        if (previous.Count == 0) return;

        user.DisplayName = displayName;
        user.Phone = phone;
        _audit.Record("APP_USER", user.Id, "UPDATE", tenant, TenantContext.ActorUsername(), summary, previous);
        try { _db.SaveChanges(); }
        catch (DbUpdateException ex) { ThrowConflict(ex, tenant, user.Id); }
        _logger.LogInformation("Member updated dealerId={DealerId} username={Username} fields={Fields} by {Actor}",
            tenant, username, string.Join(",", previous.Keys), TenantContext.ActorUsername());
    }

    /// <summary>
    /// The in-dealership administration scope: the owner acts on any member below owner, a manager
    /// acts on sales members only. The caller is already known to be the owner or a manager.
    /// </summary>
    /// <param name="caller">The signed-in owner or manager.</param>
    /// <param name="target">The active membership the caller wants to change.</param>
    /// <param name="dealerId">The caller's dealership id, for the denial log.</param>
    /// <param name="ownerTarget">The message returned when the target is the owner.</param>
    /// <param name="managerTarget">The message returned when a manager targets another manager.</param>
    /// <exception cref="ApiException">Forbidden when the target is outside the caller's scope.</exception>
    private void RequireActsOn(CurrentUser caller, MembershipEntity target, long dealerId,
        string ownerTarget, string managerTarget)
    {
        if (target.DealerRole == DealerRole.Owner)
            throw DenyMemberAction(dealerId, target.Username, "target_owner", ownerTarget);
        if (caller.DealerRole == DealerRole.Manager && target.DealerRole != DealerRole.Sales)
            throw DenyMemberAction(dealerId, target.Username, "manager_target_manager", managerTarget);
    }

    // The filter writes the status and does not log, so each in-dealership denial is recorded here.
    private ApiException DenyMemberAction(long dealerId, string username, string reason, string message)
    {
        _logger.LogWarning(
            "Member action rejected dealerId={DealerId} username={Username} reason={Reason} outcome={Outcome} by {Actor}",
            dealerId, username, reason, "forbidden", TenantContext.ActorUsername());
        return new ApiException(ErrorCode.Forbidden, message);
    }

    private void ChangeRole(long dealerId, string username, DealerRole role)
    {
        var membership = ActiveMembership(dealerId, username);
        if (membership.DealerRole == role) return;

        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;
        if (role == DealerRole.Owner)
        {
            // Appointing an owner transfers the office, because a dealership has exactly one
            // active owner (design/15 §2.5): the sitting owner becomes a manager in the same
            // transaction, and both rows are audited so the handover is traceable.
            var sitting = _db.Memberships.FirstOrDefault(m => m.DealerId == dealerId && m.Active
                && m.DealerRole == DealerRole.Owner && m.Id != membership.Id);
            if (sitting != null)
                RecordRoleChange(dealerId, sitting, DealerRole.Manager);
        }
        else
            RequireOwnerRemains(dealerId, membership, memberLeaves: false);

        RecordRoleChange(dealerId, membership, role);
        _db.SaveChanges();
        tx?.Commit();
    }

    // Sets the role on one membership row and audits it with the previous role (AUD-07). The
    // caller saves, so an ownership transfer writes both rows in one unit of work.
    private void RecordRoleChange(long dealerId, MembershipEntity membership, DealerRole role)
    {
        var previousRole = membership.DealerRole;
        membership.DealerRole = role;
        _audit.Record("MEMBERSHIP", membership.Id, "UPDATE", dealerId, TenantContext.ActorUsername(),
            new Dictionary<string, object>
            {
                ["username"] = membership.Username, ["dealerRole"] = EnumWireName.Of(role)
            },
            new Dictionary<string, object?> { ["dealerRole"] = EnumWireName.Of(previousRole) });
        _logger.LogInformation("Member role changed dealerId={DealerId} username={Username} from {PreviousRole} to {Role} by {Actor}",
            dealerId, membership.Username, EnumWireName.Of(previousRole), EnumWireName.Of(role),
            TenantContext.ActorUsername());
    }

    /// <summary>
    /// A dealership that still has staff keeps its owner: demoting, unbinding or deleting the
    /// only active owner is refused, so a successor is appointed first (design/15 §2.5). An owner
    /// who is the dealership's last active member still leaves, which empties the dealership and
    /// lets the admin bind its next owner directly.
    /// </summary>
    /// <param name="dealerId">The dealership losing the member.</param>
    /// <param name="membership">The active membership the caller wants to demote or unbind.</param>
    /// <param name="memberLeaves">True when the member loses the membership, false for a demotion that keeps it.</param>
    /// <exception cref="ApiException">LastOwner when the dealership would be left without an owner.</exception>
    private void RequireOwnerRemains(long dealerId, MembershipEntity membership, bool memberLeaves)
    {
        if (membership.DealerRole != DealerRole.Owner) return;
        // A demotion keeps the member active, so the dealership would be left with staff and no
        // owner whatever else is bound. An unbind or deletion only breaks the rule while another
        // active member remains.
        if (memberLeaves && !_db.Memberships.Any(m => m.DealerId == dealerId && m.Active && m.Id != membership.Id))
            return;
        _logger.LogWarning(
            "Member action rejected dealerId={DealerId} username={Username} reason={Reason} outcome={Outcome} by {Actor}",
            dealerId, membership.Username, "last_owner", "last_owner", TenantContext.ActorUsername());
        throw new ApiException(ErrorCode.LastOwner, LastOwnerMessage);
    }

    /// <summary>
    /// Sets a new password for an active staff member who forgot theirs. Only accounts with a
    /// DealerOps password qualify: Google and Firebase accounts sign in with a password that
    /// lives at that provider, so the person must reset it there.
    /// </summary>
    /// <param name="dealerId">The dealership whose staff member is updated.</param>
    /// <param name="username">The staff login. The new password is never logged.</param>
    /// <param name="body">The replacement password.</param>
    /// <exception cref="ApiException">Forbidden when the caller is not the platform admin, NotFound when the member is missing, or Validation when the account has no DealerOps password.</exception>
    public void ResetPassword(long dealerId, string username, ResetMemberPasswordRequest body)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);

        ActiveMembership(dealerId, username);
        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        var method = SignInMethod(user);
        if (method != "password")
        {
            _logger.LogWarning(
                "Password reset rejected dealerId={DealerId} username={Username} reason={Reason} outcome={Outcome} by {Actor}",
                dealerId, username, "external_provider", "validation", TenantContext.ActorUsername());
            var provider = method == "firebase" ? "Firebase" : "Google";
            var message = $"'{username}' signs in with {provider}, so the password is managed by {provider}, "
                          + $"not DealerOps. Ask them to use the {provider} password recovery for their email.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { ["password"] = message });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password);
        // The password itself is never written to the audit trail.
        _audit.Record("APP_USER", user.Id, "UPDATE", dealerId, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["passwordReset"] = true });
        _db.SaveChanges();
        _logger.LogInformation("Member password reset dealerId={DealerId} username={Username} by {Actor}",
            dealerId, username, TenantContext.ActorUsername());
    }

    /// <summary>
    /// How the account signs in. A Google or Firebase sign-in linked to an account that already
    /// had a DealerOps password still counts as <c>password</c>: that password keeps working.
    /// </summary>
    private static string SignInMethod(AppUserEntity? user) =>
        !string.IsNullOrEmpty(user?.PasswordHash) ? "password"
        : user?.FirebaseUid != null ? "firebase"
        : "google";

    /// <summary>Admin soft unbind of any member, owner, manager or sales, from the dealership.</summary>
    public void Remove(long dealerId, string username)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        Unbind(dealerId, username);
    }

    /// <summary>
    /// The platform admin edits the sign-in email and phone of a member listed at the dealership,
    /// active or unbound (A6). Same validation and uniqueness as registration: at least one of the
    /// two, canonical form, and not registered to another account.
    /// </summary>
    public MemberResponse UpdateContact(long dealerId, string username, PatchMemberContactRequest body)
    {
        TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        var membership = ListedMembership(dealerId, username);
        var user = ListedUser(username);

        var contact = _accountRules.CanonicalContact(body.Email, body.Phone);
        _accountRules.RequireAvailable(user.Username, contact, user.Id);

        var summary = new Dictionary<string, object> { ["username"] = username };
        var previous = new Dictionary<string, object?>();
        if (user.Email != contact.Email)
        {
            summary["email"] = (object?)contact.Email ?? "";
            previous["email"] = user.Email;
        }
        if (user.Phone != contact.Phone)
        {
            summary["phone"] = (object?)contact.Phone ?? "";
            previous["phone"] = user.Phone;
        }
        if (previous.Count > 0)
        {
            user.Email = contact.Email;
            user.Phone = contact.Phone;
            _audit.Record("APP_USER", user.Id, "UPDATE", dealerId, TenantContext.ActorUsername(), summary, previous);
            try { _db.SaveChanges(); }
            catch (DbUpdateException ex) { ThrowConflict(ex, dealerId, user.Id); }
            _logger.LogInformation("Member contact updated dealerId={DealerId} username={Username} fields={Fields} by {Actor}",
                dealerId, username, string.Join(",", previous.Keys), TenantContext.ActorUsername());
        }

        return new MemberResponse(membership.Username, user.DisplayName, AppRole.DealerUser.Value, membership.Active,
            SignInMethod(user), user.Email, user.Phone, membership.DealerRole);
    }

    /// <summary>
    /// The platform admin deletes a member's account (A6) with the same soft delete as
    /// Profile > Delete account: memberships are unbound, a pending join request is cancelled, the
    /// login is made inactive and its email, phone and Google link are freed (see RetireLogin).
    /// The username and audit trail stay.
    /// The platform admin account, the caller included, cannot be deleted.
    /// </summary>
    public void DeleteAccount(long dealerId, string username)
    {
        var caller = TenantGuard.RequireAdmin();
        RequireDealer(dealerId);
        ListedMembership(dealerId, username);
        var user = ListedUser(username);
        if (user.Role == AppRole.PlatformAdmin
            || string.Equals(user.Username, caller.Username, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Account deletion rejected username={Username} reason={Reason} by {Actor}",
                username, "platform_admin", caller.Username);
            throw new ApiException(ErrorCode.Forbidden, "The platform admin account cannot be deleted.");
        }

        var actor = caller.Username;
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;
        foreach (var m in _db.Memberships.Where(m => m.Username == username && m.Active).ToList())
        {
            RequireOwnerRemains(m.DealerId, m, memberLeaves: true);
            m.Active = false;
            _audit.Record("MEMBERSHIP", m.Id, "UPDATE", m.DealerId, actor,
                new Dictionary<string, object> { ["username"] = username, ["unbound"] = true },
                new Dictionary<string, object?> { ["unbound"] = false });
        }
        var previous = new Dictionary<string, object?>
        {
            ["active"] = true, ["email"] = user.Email, ["phone"] = user.Phone
        };
        RetireLogin(user, actor);

        _audit.Record("APP_USER", user.Id, "DELETE", dealerId, actor,
            new Dictionary<string, object> { ["username"] = username, ["active"] = false }, previous);
        _db.SaveChanges();
        tx?.Commit();
        _logger.LogInformation("Account deleted by admin userId={UserId} username={Username} dealerId={DealerId} by {Actor}",
            user.Id, username, dealerId, actor);
    }

    /// <summary>
    /// Soft-deletes a login the same way as Profile > Delete account: a pending join request is
    /// cancelled, the row is made inactive, and its email, phone and Google link get a
    /// <c>:deleted:&lt;id&gt;</c> marker so they are free for a new sign-up. The caller audits and saves.
    /// </summary>
    private void RetireLogin(AppUserEntity user, string actor)
    {
        if (user.RequestedDealerId is long requested)
            _notifications.ResolveByCorrelation(requested, "JOIN_REQUEST", "username", user.Username, "CANCELLED", actor);
        user.Active = false;
        user.DealerId = null;
        user.RequestedDealerId = null;
        var marker = $":deleted:{user.Id}";
        if (user.Email != null) user.Email += marker;
        if (user.Phone != null) user.Phone += marker;
        if (user.GoogleSub != null) user.GoogleSub += marker;
    }

    // A membership row of this dealership, active or unbound, as listed on the admin Members tab.
    private MembershipEntity ListedMembership(long dealerId, string username) =>
        _db.Memberships.FirstOrDefault(m => m.DealerId == dealerId && m.Username == username)
        ?? throw new ApiException(ErrorCode.NotFound, "Not found");

    // A login that has not been deleted.
    private AppUserEntity ListedUser(string username) =>
        _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Active)
        ?? throw new ApiException(ErrorCode.NotFound, "Not found");

    /// <summary>
    /// The owner removes managers and sales members, and a manager removes sales members, from
    /// their own dealership (AUTH-27); same soft unbind as the admin. The owner, the caller
    /// included, is removed only by the admin.
    /// </summary>
    public void RemoveFromOwnDealership(string username)
    {
        var caller = TenantGuard.RequireTeamAccess();
        var tenant = caller.TenantDealerId!.Value;
        RequireActsOn(caller, ActiveMembership(tenant, username), tenant,
            ownerTarget: "Only the platform admin can remove the dealership owner.",
            managerTarget: "Only the dealership owner can remove a manager.");
        Unbind(tenant, username);
    }

    /// <summary>
    /// Soft unbind: the membership row stays for history with <c>active = false</c> and the login
    /// loses its dealership.
    /// </summary>
    private void Unbind(long dealerId, string username)
    {
        var membership = ActiveMembership(dealerId, username);
        RequireOwnerRemains(dealerId, membership, memberLeaves: true);

        membership.Active = false;

        var user = _db.AppUsers.FirstOrDefault(u => u.Username == username);
        if (user != null)
            user.DealerId = null;

        _audit.Record("MEMBERSHIP", membership.Id, "UPDATE", dealerId, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["username"] = username, ["unbound"] = true },
            new Dictionary<string, object?> { ["unbound"] = false });
        _db.SaveChanges();
        _logger.LogInformation("Member unbound dealerId={DealerId} username={Username} by {Actor}",
            dealerId, username, TenantContext.ActorUsername());
    }

    /// <summary>
    /// Admin queue of active dealer-user logins with no active membership, newest account first.
    /// The optional sort orders the whole queue before paging (CR-018).
    /// </summary>
    public PageResponse<PendingUserResponse> Pending(string? q, int page, int size, string? sort = null)
    {
        TenantGuard.RequireAdmin();
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        var descending = Paging.ParseSort(sort, PendingSortFields)?.Descending ?? true;

        var query = _db.AppUsers
            .Where(u => u.Role == AppRole.DealerUser && u.Active)
            .Where(u => !_db.Memberships.Any(m => m.Username == u.Username && m.Active));

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim();
            query = query.Where(u =>
                u.Username.Contains(needle) ||
                u.DisplayName.Contains(needle));
        }

        query = descending
            ? query.OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id)
            : query.OrderBy(u => u.CreatedAt).ThenBy(u => u.Id);

        var total = query.LongCount();
        var users = query.Skip(p * s).Take(s).ToList();
        var requestedIds = users.Where(u => u.RequestedDealerId != null).Select(u => u.RequestedDealerId!.Value).Distinct().ToList();
        var dealerNames = _db.Dealers.Where(d => requestedIds.Contains(d.Id)).ToDictionary(d => d.Id, d => d.LegalName);
        var items = users.Select(u => ToPending(u, dealerNames)).ToList();

        return new PageResponse<PendingUserResponse>(items, p, s, total);
    }

    /// <summary>
    /// The admin edits a pending account's username, email and phone with the registration rules:
    /// same formats, an email or a phone is required, and each value stays unique (AUTH-28).
    /// Renaming also renames the account's old membership rows, and a pending join request is
    /// re-posted to that dealership's inbox under the new values.
    /// </summary>
    public PendingUserResponse UpdatePending(string username, UpdatePendingUserRequest body)
    {
        TenantGuard.RequireAdmin();
        var user = PendingAccount(username);
        var newUsername = body.Username.Trim();
        var contact = _accountRules.CanonicalContact(body.Email, body.Phone);
        _accountRules.RequireAvailable(newUsername, contact, user.Id);

        var oldUsername = user.Username;
        var summary = new Dictionary<string, object> { ["username"] = newUsername };
        var previous = new Dictionary<string, object?>();
        if (user.Username != newUsername) previous["username"] = user.Username;
        if (user.Email != contact.Email) { summary["email"] = (object?)contact.Email ?? ""; previous["email"] = user.Email; }
        if (user.Phone != contact.Phone) { summary["phone"] = (object?)contact.Phone ?? ""; previous["phone"] = user.Phone; }
        if (previous.Count == 0) return ToPending(user, RequestedDealerName(user));

        var actor = TenantContext.ActorUsername();
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;
        if (previous.ContainsKey("username"))
            foreach (var m in _db.Memberships.Where(m => m.Username == oldUsername).ToList())
                m.Username = newUsername;
        user.Username = newUsername;
        user.Email = contact.Email;
        user.Phone = contact.Phone;
        _audit.Record("APP_USER", user.Id, "UPDATE", null, actor, summary, previous);
        try { _db.SaveChanges(); }
        catch (DbUpdateException ex) { ThrowConflict(ex, 0, user.Id); }
        _joinRequests.RefreshNotification(user, oldUsername, actor);
        tx?.Commit();
        _logger.LogInformation("Pending account updated userId={UserId} fields={Fields} by {Actor}",
            user.Id, string.Join(",", previous.Keys), actor);
        return ToPending(user, RequestedDealerName(user));
    }

    /// <summary>
    /// The admin deletes a pending account (AUTH-28). Same soft delete as an account the user
    /// cancels: the row and its audit trail stay, the login is deactivated, its email, phone and
    /// Google link are freed for a new sign-up, and a pending join request is cancelled.
    /// </summary>
    public void DeletePending(string username)
    {
        TenantGuard.RequireAdmin();
        var user = PendingAccount(username);
        var actor = TenantContext.ActorUsername();
        var requested = user.RequestedDealerId;

        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;
        RetireLogin(user, actor);
        _audit.Record("APP_USER", user.Id, "DELETE", requested, actor,
            new Dictionary<string, object> { ["username"] = user.Username, ["active"] = false },
            new Dictionary<string, object?> { ["active"] = true, ["requestedDealerId"] = requested });
        _db.SaveChanges();
        tx?.Commit();
        _logger.LogInformation("Pending account deleted userId={UserId} username={Username} by {Actor}",
            user.Id, user.Username, actor);
    }

    /// <summary>Fields the pending-accounts queue sorts by: the Registered column.</summary>
    private static readonly string[] PendingSortFields = ["createdAt"];

    private AppUserEntity PendingAccount(string username) =>
        _db.AppUsers.FirstOrDefault(u => u.Username == username && u.Role == AppRole.DealerUser && u.Active
            && !_db.Memberships.Any(m => m.Username == u.Username && m.Active))
        ?? throw new ApiException(ErrorCode.NotFound, "Pending account not found.");

    private Dictionary<long, string> RequestedDealerName(AppUserEntity user) =>
        _db.Dealers.Where(d => d.Id == user.RequestedDealerId).ToDictionary(d => d.Id, d => d.LegalName);

    private static PendingUserResponse ToPending(AppUserEntity u, IReadOnlyDictionary<long, string> dealerNames) =>
        new(u.Username, u.DisplayName, u.Email, u.Phone, DateTime.SpecifyKind(u.CreatedAt, DateTimeKind.Utc),
            u.RequestedDealerId,
            u.RequestedDealerId is long id ? dealerNames.GetValueOrDefault(id) : null);

    // A duplicate key is an expected conflict. Any other save failure is still returned as a
    // conflict, so it is logged here. The database message can contain an email or phone, so
    // only the exception type is recorded.
    private void ThrowConflict(DbUpdateException ex, long dealerId, long userId)
    {
        if (!DuplicateKey.Is(ex))
            _logger.LogError(
                "Member save failed userId={UserId} dealerId={DealerId} reason={Reason} outcome={Outcome}",
                userId, dealerId, ex.InnerException?.GetType().Name ?? ex.GetType().Name, "error");
        throw _accountRules.Conflict(ex);
    }

    private static void RequireNewUserFields(CreateMemberRequest body)
    {
        var missing = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(body.DisplayName))
            missing["displayName"] = "Full name is required for a new user.";
        if (string.IsNullOrWhiteSpace(body.Password))
            missing["password"] = "Password is required for a new user.";
        if (missing.Count > 0)
            throw new ApiException(ErrorCode.Validation, missing.Values.First(), missing);
    }

    private MembershipEntity ActiveMembership(long dealerId, string username) =>
        _db.Memberships.FirstOrDefault(m => m.DealerId == dealerId && m.Username == username && m.Active)
        ?? throw new ApiException(ErrorCode.NotFound, "Not found");

    private void RequireDealer(long dealerId)
    {
        if (!_db.Dealers.Any(d => d.Id == dealerId && d.DeletedAt == null))
            throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private static bool Matches(MemberResponse item, string? q)
    {
        if (string.IsNullOrWhiteSpace(q)) return true;
        var needle = q.Trim().ToLowerInvariant();
        return (item.DisplayName ?? "").ToLowerInvariant().Contains(needle)
               || (item.Username ?? "").ToLowerInvariant().Contains(needle)
               || (item.Email ?? "").ToLowerInvariant().Contains(needle)
               || (item.Phone ?? "").Contains(needle);
    }

}
