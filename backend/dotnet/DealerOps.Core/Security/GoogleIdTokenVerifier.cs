using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DealerOps.Core.Common.Exceptions;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace DealerOps.Core.Security;

/// <summary>
/// The part of a verified Google ID token this application acts on. Everything here comes
/// from the default <c>openid email profile</c> scope — no extra OAuth consent, no review.
/// <see cref="Subject"/> is Google's stable per-user id (the <c>sub</c> claim); the rest are
/// optional because older Google accounts can be missing a given/family split or a picture.
/// </summary>
public record GoogleIdentity(
    string Subject,
    string Email,
    string? Name,
    string? GivenName,
    string? FamilyName,
    string? Picture,
    string? Locale);

/// <summary>
/// Verifies a Google Identity Services ID token server-side. Google only proves which email
/// address signed in; it grants no role and no dealership. Authorisation stays with
/// <see cref="Dealer.MembershipService"/>, so a verified token alone gives no business access.
/// </summary>
public class GoogleIdTokenVerifier
{
    private const string MetadataAddress = "https://accounts.google.com/.well-known/openid-configuration";

    // The Google OAuth web client this deployment belongs to. A client id is a public
    // identifier, not a secret: the browser hands it to Google on every sign-in. It is
    // compiled in because it identifies the DealerOps application itself and therefore does
    // not vary between local, test and Azure. The backend uses it as the expected audience,
    // which is what stops an ID token minted for some other application being accepted here.
    public const string ClientId = "660111025309-k8qneu1ifuhgtptb3onimtq988bb1pku.apps.googleusercontent.com";

    // Google has issued ID tokens under both spellings of its issuer claim.
    private static readonly string[] ValidIssuers = ["https://accounts.google.com", "accounts.google.com"];

    private readonly string? _hostedDomain;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _metadata;
    private readonly ILogger<GoogleIdTokenVerifier> _logger;

    // MapInboundClaims would rename "sub" to a ClaimTypes URI; keep Google's own claim names.
    private readonly JwtSecurityTokenHandler _handler = new() { MapInboundClaims = false };

    public GoogleIdTokenVerifier(IConfiguration config, ILogger<GoogleIdTokenVerifier> logger)
    {
        _logger = logger;
        var domain = (config["Google:HostedDomain"] ?? "").Trim();
        _hostedDomain = domain.Length == 0 ? null : domain;

        // Caches Google's signing keys and refreshes them on its own schedule, so each
        // sign-in does not fetch the key set.
        _metadata = new ConfigurationManager<OpenIdConnectConfiguration>(
            MetadataAddress, new OpenIdConnectConfigurationRetriever(), new HttpDocumentRetriever());
    }

    /// <summary>
    /// Validates the token's signature, issuer, audience and lifetime and returns its identity.
    /// Throws 401 for a rejected or unverified-email token, 403 for a token outside the configured
    /// hosted domain, and 500 when Google's signing keys cannot be fetched.
    /// </summary>
    /// <param name="idToken">The Google ID token. It is verified and never logged.</param>
    /// <param name="cancellationToken">Cancels the signing-key fetch.</param>
    /// <returns>The verified Google identity claims this application stores.</returns>
    /// <exception cref="ApiException">Unauthorized or Forbidden when the token is rejected, or InternalError when signing keys cannot be fetched.</exception>
    public async Task<GoogleIdentity> VerifyAsync(string idToken, CancellationToken cancellationToken)
    {
        OpenIdConnectConfiguration config;
        try
        {
            config = await _metadata.GetConfigurationAsync(cancellationToken);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "Could not fetch Google signing keys from {MetadataAddress}", MetadataAddress);
            throw new ApiException(ErrorCode.InternalError, "Could not reach Google to verify the sign-in.");
        }

        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers = ValidIssuers,
            ValidateAudience = true,
            ValidAudience = ClientId,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = config.SigningKeys,
            // Google signs ID tokens with RS256. Pinning the algorithm blocks substitution attacks.
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        ClaimsPrincipal principal;
        try
        {
            principal = _handler.ValidateToken(idToken, parameters, out _);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            if (ex is SecurityTokenException or ArgumentException)
                throw Rejected(TokenReason(ex));
            LogVerifierFailure(ex, idToken);
            throw Rejected("verifier_failure");
        }

        var email = principal.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email))
            throw Rejected("email_missing");

        // An unverified address would let anyone claim a colleague's email, so it is refused
        // even though the signature is valid.
        if (!bool.TryParse(principal.FindFirstValue("email_verified"), out var verified) || !verified)
            throw Denied(ErrorCode.Unauthorized, "Verify your email address with Google first.", "email_unverified");

        if (_hostedDomain != null
            && !string.Equals(principal.FindFirstValue("hd"), _hostedDomain, StringComparison.OrdinalIgnoreCase))
            throw Denied(ErrorCode.Forbidden, "Use your organisation's Google account to sign in.", "hosted_domain");

        var subject = principal.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(subject))
            throw Rejected("subject_missing");

        return new GoogleIdentity(
            subject,
            email,
            principal.FindFirstValue("name"),
            principal.FindFirstValue("given_name"),
            principal.FindFirstValue("family_name"),
            principal.FindFirstValue("picture"),
            principal.FindFirstValue("locale"));
    }

    // One message for every cryptographic rejection, so a caller cannot probe which part failed.
    // The reason code is for the sign-in log and audit row, not the response body.
    private static ApiException Rejected(string reason = "invalid_token") =>
        Denied(ErrorCode.Unauthorized, "Google sign-in failed.", reason);

    private static ApiException Denied(ErrorCode code, string message, string reason)
    {
        var error = new ApiException(code, message);
        error.Data["authReason"] = reason;
        return error;
    }

    private static string TokenReason(Exception ex) => ex switch
    {
        SecurityTokenExpiredException => "expired_token",
        SecurityTokenInvalidSignatureException => "invalid_signature",
        SecurityTokenInvalidAudienceException => "invalid_audience",
        SecurityTokenInvalidIssuerException => "invalid_issuer",
        SecurityTokenInvalidLifetimeException => "invalid_lifetime",
        SecurityTokenMalformedException => "malformed_token",
        _ => "invalid_token"
    };

    // The exception text is dropped when it contains the token.
    private void LogVerifierFailure(Exception ex, string idToken)
    {
        if (idToken.Length > 0 && ex.ToString().Contains(idToken, StringComparison.Ordinal))
            _logger.LogError("Google token verification failed reason={Reason} outcome={Outcome}", "verifier_failure", "unauthorized");
        else
            _logger.LogError(ex, "Google token verification failed reason={Reason} outcome={Outcome}", "verifier_failure", "unauthorized");
    }
}
