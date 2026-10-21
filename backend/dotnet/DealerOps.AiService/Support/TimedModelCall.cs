namespace DealerOps.AiService.Support;

/// <summary>
/// Runs a model call under the AI-02 time budget (connect + response timeout) and a cap of
/// 16 concurrent calls, mapping every failure to a <see cref="ModelFailureException"/>.
/// </summary>
public class TimedModelCall
{
    private const int MaxConcurrent = 16;

    private readonly SemaphoreSlim _semaphore = new(MaxConcurrent, MaxConcurrent);
    private readonly int _connectTimeoutMs;
    private readonly int _responseTimeoutMs;

    public TimedModelCall(int connectTimeoutMs, int responseTimeoutMs)
    {
        _connectTimeoutMs = connectTimeoutMs;
        _responseTimeoutMs = responseTimeoutMs;
    }

    /// <summary>Runs <paramref name="call"/> with a cancellation token that fires at the budget.</summary>
    /// <exception cref="ModelFailureException">Busy, timed out, or any other failure.</exception>
    public async Task<T> RequestAsync<T>(Func<CancellationToken, Task<T>> call)
    {
        var totalMs = _connectTimeoutMs + _responseTimeoutMs;

        // Rejected for concurrency, not for elapsed time: report it as its own code
        // so an overload is never read as a model timeout.
        if (!await _semaphore.WaitAsync(0))
            throw ModelFailureException.BusyError();

        try
        {
            using var cts = new CancellationTokenSource(totalMs);
            return await call(cts.Token);
        }
        catch (OperationCanceledException)
        {
            throw ModelFailureException.TimeoutError();
        }
        catch (ModelFailureException)
        {
            throw;
        }
        catch (Exception)
        {
            throw ModelFailureException.ProviderFailedError();
        }
        finally
        {
            _semaphore.Release();
        }
    }
}
