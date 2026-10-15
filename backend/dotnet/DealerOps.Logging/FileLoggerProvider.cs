using System.Globalization;
using Microsoft.Extensions.Logging;

namespace DealerOps.Logging;

public sealed class FileLoggerProvider : ILoggerProvider
{
    private readonly string _directory;
    private readonly string _serviceName;
    private readonly TimeSpan _retention;
    private readonly object _gate = new();

    public FileLoggerProvider(string directory, string serviceName, TimeSpan? retention = null)
    {
        _directory = Path.GetFullPath(directory);
        _serviceName = serviceName;
        _retention = retention ?? TimeSpan.FromDays(7);
        Directory.CreateDirectory(_directory);
        RemoveExpiredLogs();
    }

    public ILogger CreateLogger(string categoryName) => new FileLogger(this, categoryName);
    public void Dispose() { }

    private void Write(string categoryName, LogLevel level, string message, Exception? exception)
    {
        var file = Path.Combine(_directory, $"{_serviceName}-{DateTime.Now:yyyy-MM-dd}.log");
        var line = $"{DateTimeOffset.Now:O} [{level}] {categoryName}: {message}";
        if (exception != null) line += Environment.NewLine + exception;
        lock (_gate) File.AppendAllText(file, line + Environment.NewLine);
    }

    private void RemoveExpiredLogs()
    {
        var cutoff = DateTime.Now.Date - _retention;
        var prefix = _serviceName + "-";
        foreach (var file in Directory.EnumerateFiles(_directory, $"{_serviceName}-*.log"))
        {
            var name = Path.GetFileNameWithoutExtension(file);
            var dateText = name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                ? name[prefix.Length..] : "";
            if (DateTime.TryParseExact(dateText, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var date) && date.Date < cutoff.Date)
            {
                try { File.Delete(file); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }
    }

    private sealed class FileLogger : ILogger
    {
        private readonly FileLoggerProvider _provider;
        private readonly string _categoryName;
        public FileLogger(FileLoggerProvider provider, string categoryName)
        {
            _provider = provider;
            _categoryName = categoryName;
        }

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state,
            Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (IsEnabled(logLevel)) _provider.Write(_categoryName, logLevel, formatter(state, exception), exception);
        }

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }
}
