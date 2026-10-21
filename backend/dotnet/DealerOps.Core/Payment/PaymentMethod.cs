namespace DealerOps.Core.Payment;

// How the buyer paid. Values stored lower snake_case via EnumSnakeCaseConverter.
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
