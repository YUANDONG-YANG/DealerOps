namespace DealerOps.Core.Common.Exceptions;

public enum ErrorCode
{
    Validation,
    VinDup,
    SoldPairRequired,
    WrongDealerOrSold,
    Unauthorized,
    Forbidden,
    NotFound,
    MethodNotAllowed,
    VersionConflict,
    DupMember,
    UsernameTaken,
    DisplayNameTaken,
    EmailTaken,
    PhoneTaken,
    VehicleAlreadyLinked,
    SoldLocked,
    CheckStale,
    NotPassed,
    LeadClosed,
    WorkOrderClosed,
    WorkOrdersOpen,
    UnsupportedMediaType,
    InternalError,
    AiUnavailable,
    CatalogUnavailable
}

public static class ErrorCodeExtensions
{
    public static string ToWireCode(this ErrorCode code)
    {
        var name = code.ToString();
        var sb = new System.Text.StringBuilder(name.Length + 4);
        for (var i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c) && i > 0)
                sb.Append('_');
            sb.Append(char.ToUpperInvariant(c));
        }
        return sb.ToString();
    }

    public static int HttpStatus(this ErrorCode code) => code switch
    {
        ErrorCode.Validation => 400,
        ErrorCode.VinDup => 400,
        ErrorCode.SoldPairRequired => 400,
        ErrorCode.WrongDealerOrSold => 400,
        ErrorCode.Unauthorized => 401,
        ErrorCode.Forbidden => 403,
        ErrorCode.NotFound => 404,
        ErrorCode.MethodNotAllowed => 405,
        ErrorCode.VersionConflict => 409,
        ErrorCode.DupMember => 409,
        ErrorCode.UsernameTaken => 409,
        ErrorCode.DisplayNameTaken => 409,
        ErrorCode.EmailTaken => 409,
        ErrorCode.PhoneTaken => 409,
        ErrorCode.VehicleAlreadyLinked => 409,
        ErrorCode.SoldLocked => 409,
        ErrorCode.CheckStale => 409,
        ErrorCode.NotPassed => 409,
        ErrorCode.LeadClosed => 409,
        ErrorCode.WorkOrderClosed => 409,
        ErrorCode.WorkOrdersOpen => 409,
        ErrorCode.UnsupportedMediaType => 415,
        ErrorCode.InternalError => 500,
        ErrorCode.AiUnavailable => 502,
        ErrorCode.CatalogUnavailable => 502,
        _ => 500
    };
}
