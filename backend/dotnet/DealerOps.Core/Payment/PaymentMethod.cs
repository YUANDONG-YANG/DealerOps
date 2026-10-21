namespace DealerOps.Core.Payment;

/// <summary>How the buyer paid. Stored lower snake_case via EnumSnakeCaseConverter; SCREAMING_SNAKE on the wire.</summary>
public enum PaymentMethod
{
    Cash,
    Debit,
    CreditCard,
    Cheque,
    BankTransfer,
    Financing,
    Other
}
