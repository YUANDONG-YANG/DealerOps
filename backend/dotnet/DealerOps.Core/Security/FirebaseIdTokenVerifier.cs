using DealerOps.Core.Common.Exceptions;
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using AppErrorCode = DealerOps.Core.Common.Exceptions.ErrorCode;

namespace DealerOps.Core.Security;

/// <summary>The part of a verified Firebase ID token this application acts on.</summary>
public record FirebaseIdentity(
    string Uid,
    string Email,
    bool EmailVerified,
    string? DisplayName,
    string? PhoneNumber);

/// <summary>
/// Verifies Firebase Authentication ID tokens server-side with the Firebase Admin SDK. Firebase
/// proves who signed in; role, dealership and authorization stay with DealerOps.
/// </summary>
public sealed class FirebaseIdTokenVerifier
{
    private const string ProjectId = "dealer-ops-c0851";
    private readonly ILogger<FirebaseIdTokenVerifier> _logger;
    private FirebaseAuth? _auth;

    public FirebaseIdTokenVerifier(ILogger<FirebaseIdTokenVerifier> logger) => _logger = logger;

    /// <summary>
    /// Validates the token and returns its identity. Throws 401 for a rejected token or one
    /// without an email address, and 500 when the server's Firebase credentials are missing.
    /// </summary>
    public async Task<FirebaseIdentity> VerifyAsync(string idToken, CancellationToken cancellationToken)
    {
        FirebaseToken decoded;
        try
        {
            decoded = await Auth.VerifyIdTokenAsync(idToken, cancellationToken);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested && ex is not ApiException)
        {
            throw new ApiException(AppErrorCode.Unauthorized, "Firebase sign-in failed.");
        }

        var email = decoded.Claims.TryGetValue("email", out var emailValue)
            ? emailValue?.ToString()?.Trim()
            : null;
        if (string.IsNullOrWhiteSpace(email))
            throw new ApiException(AppErrorCode.Unauthorized, "Firebase sign-in requires an email address.");
        // Unverified addresses are accepted for now; AuthService only refuses to link one to an
        // existing account, since the email cannot prove ownership of that account.
        bool.TryParse(Claim(decoded, "email_verified"), out var emailVerified);

        var displayName = Claim(decoded, "name");
        var phoneNumber = Claim(decoded, "phone_number");
        return new FirebaseIdentity(decoded.Uid, email, emailVerified, displayName, phoneNumber);
    }

    private static string? Claim(FirebaseToken token, string name) =>
        token.Claims.TryGetValue(name, out var value) ? value?.ToString() : null;

    private FirebaseAuth Auth
    {
        get
        {
            if (_auth != null) return _auth;

            try
            {
                var credential = GoogleCredential.GetApplicationDefault();
                var app = FirebaseApp.Create(new AppOptions
                {
                    Credential = credential,
                    ProjectId = ProjectId,
                });
                return _auth = FirebaseAuth.GetAuth(app);
            }
            catch (Exception ex) when (ex is InvalidOperationException || ex is ArgumentException)
            {
                _logger.LogError(ex, "Firebase Admin SDK could not be initialised projectId={ProjectId}", ProjectId);
                throw new ApiException(AppErrorCode.InternalError,
                    "Firebase server credentials are not configured.");
            }
        }
    }
}
