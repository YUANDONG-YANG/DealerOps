using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace DealerOps.Core.Data;

public class EnumSnakeCaseConverter<T> : ValueConverter<T, string> where T : struct, Enum
{
    public EnumSnakeCaseConverter()
        : base(v => ToSnakeCase(v), v => FromSnakeCase(v)) { }

    private static string ToSnakeCase(T value)
    {
        var name = value.ToString();
        var sb = new StringBuilder();
        for (var i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c) && i > 0)
                sb.Append('_');
            sb.Append(char.ToUpperInvariant(c));
        }
        return sb.ToString();
    }

    private static T FromSnakeCase(string value)
    {
        var pascal = Regex.Replace(value, "(?:^|_)([a-zA-Z])", m => m.Groups[1].Value.ToUpperInvariant());
        return Enum.Parse<T>(pascal, ignoreCase: true);
    }
}
