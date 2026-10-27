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
    /// <param name="idToken">The Firebase ID token. It is verified and never logged.</param>
    /// <param name="cancellationToken">Cancels token verification.</param>
    /// <returns>The verified Firebase identity this application stores.</returns>
    /// <exception cref="ApiException">Unauthorized when the token is rejected or has no email, or InternalError when server credentials are missing.</exception>
    public async Task<FirebaseIdentity> VerifyAsync(string idToken, CancellationToken cancellationToken)
    {
        FirebaseToken decoded;
        try
        {
            decoded = await Auth.VerifyIdTokenAsync(idToken, cancellationToken);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested && ex is not ApiException)
        {
            throw VerificationFailed(ex, idToken);
        }

        var email = decoded.Claims.TryGetValue("email", out var emailValue)
            ? emailValue?.ToString()?.Trim()
            : null;
        if (string.IsNullOrWhiteSpace(email))
            throw Reject(AppErrorCode.Unauthorized, "Firebase sign-in requires an email address.", "email_missing");
        // Unverified addresses are accepted for now; AuthService only refuses to link one to an
        // existing account, since the email cannot prove ownership of that account.
        bool.TryParse(Claim(decoded, "email_verified"), out var emailVerified);

        var displayName = Claim(decoded, "name");
        var phoneNumber = Claim(decoded, "phone_number");
        return new FirebaseIdentity(decoded.Uid, email, emailVerified, displayName, phoneNumber);
    }

    private static string? Claim(FirebaseToken token, string name) =>
        token.Claims.TryGetValue(name, out var value) ? value?.ToString() : null;

    // Expected token rejections stay a sign-in warning in AuthService. A provider or key
    // failure is logged here because that warning would otherwise hide it. The token is omitted
    // when the exception text contains it.
    private ApiException VerificationFailed(Exception ex, string idToken)
    {
        if (ex is ArgumentException)
            return Reject(AppErrorCode.Unauthorized, "Firebase sign-in failed.", "invalid_token");

        if (ex is FirebaseAuthException auth)
        {
            var reason = auth.AuthErrorCode switch
            {
                AuthErrorCode.ExpiredIdToken => "expired_id_token",
                AuthErrorCode.InvalidIdToken => "invalid_id_token",
                AuthErrorCode.RevokedIdToken => "revoked_id_token",
                null => "invalid_token",
                AuthErrorCode.CertificateFetchFailed => "certificate_fetch_failed",
                AuthErrorCode.UnexpectedResponse => "unexpected_response",
                _ => "verifier_failure"
            };
            var expected = reason is "expired_id_token" or "invalid_id_token" or "revoked_id_token" or "invalid_token";
            if (!expected)
                LogVerifierFailure(ex, idToken, reason);
            return Reject(AppErrorCode.Unauthorized, "Firebase sign-in failed.", reason);
        }

        LogVerifierFailure(ex, idToken, "verifier_failure");
        return Reject(AppErrorCode.Unauthorized, "Firebase sign-in failed.", "verifier_failure");
    }

    private void LogVerifierFailure(Exception ex, string idToken, string reason)
    {
        if (idToken.Length > 0 && ex.ToString().Contains(idToken, StringComparison.Ordinal))
            _logger.LogError("Firebase token verification failed reason={Reason} outcome={Outcome}", reason, "unauthorized");
        else
            _logger.LogError(ex, "Firebase token verification failed reason={Reason} outcome={Outcome}", reason, "unauthorized");
    }

    private static ApiException Reject(AppErrorCode code, string message, string reason)
    {
        var error = new ApiException(code, message);
        error.Data["authReason"] = reason;
        return error;
    }

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
