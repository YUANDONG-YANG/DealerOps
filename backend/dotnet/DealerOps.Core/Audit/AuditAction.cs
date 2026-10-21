namespace DealerOps.Core.Audit;

/// <summary>
/// Audit actions. LOGIN and LOGIN_FAILED are sign-in attempts on APP_USER; CHECK is an ad
/// compliance check run and EXPORT an ad TXT export, both on LISTING.
/// </summary>
public enum AuditAction { Create, Update, Sell, Link, Unlink, Note, Delete, Login, LoginFailed, Check, Export }
