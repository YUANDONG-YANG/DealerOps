namespace DealerOps.AiService.Support;

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
