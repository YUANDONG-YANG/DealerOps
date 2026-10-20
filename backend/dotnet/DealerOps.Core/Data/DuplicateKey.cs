using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace DealerOps.Core.Data;

/// <summary>
/// Detects a MySQL duplicate-key failure (error 1062) from the exception type, not from an
/// index name inside the message. Callers decide which API error that collision is.
/// </summary>
internal static class DuplicateKey
{
    public static bool Is(DbUpdateException ex)
    {
        for (Exception? current = ex; current != null; current = current.InnerException)
        {
            if (current is MySqlException mysql && mysql.Number == 1062)
                return true;
        }
        return false;
    }
}
