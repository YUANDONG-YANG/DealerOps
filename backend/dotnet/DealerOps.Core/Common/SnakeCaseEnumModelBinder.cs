using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace DealerOps.Core.Common;

// Query and route enums use the same UPPER_SNAKE_CASE wire form as JSON bodies ("IN_STOCK",
// "AS_IS"). The default binder only accepts C# names, so multi-word values were rejected with 400.
public class SnakeCaseEnumModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext context)
    {
        var raw = context.ValueProvider.GetValue(context.ModelName).FirstValue;
        if (string.IsNullOrWhiteSpace(raw)) return Task.CompletedTask;

        var enumType = Nullable.GetUnderlyingType(context.ModelType) ?? context.ModelType;
        var name = raw.Trim().Replace("_", "");
        // Numeric strings would parse to undefined members, so only declared names are accepted.
        if (!name.All(char.IsLetter) || !Enum.TryParse(enumType, name, ignoreCase: true, out var value))
        {
            context.ModelState.TryAddModelError(context.ModelName, $"Unsupported value '{raw}'.");
            return Task.CompletedTask;
        }

        context.Result = ModelBindingResult.Success(value);
        return Task.CompletedTask;
    }
}

public class SnakeCaseEnumModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        var type = Nullable.GetUnderlyingType(context.Metadata.ModelType) ?? context.Metadata.ModelType;
        var fromBody = context.BindingInfo.BindingSource == BindingSource.Body;
        return type.IsEnum && !fromBody ? new SnakeCaseEnumModelBinder() : null;
    }
}
