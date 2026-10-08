package ca.sait.dealerops.aiservice.support;

import com.manager.core.AIResponse;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Library {@code blockOptional} has no 15s guarantee (PROTOCOL §D). Hard cap is connect +
 * response (2s+13s), not a single undifferentiated 15000. The {@link WebClient} bean carries the
 * same HttpClient split for any adapter-owned HTTP.
 *
 * <p>The blocking call runs on {@link #MODEL_CALLS}, never on {@code ForkJoinPool.commonPool()}.
 * {@code CompletableFuture.orTimeout} only completes the waiter and leaves the task running. A
 * timeout here {@code cancel(true)}s the task and drops it from the queue so an interruptible
 * call releases its worker. If the provider ignores interruption, that worker stays busy until
 * the call returns; additional calls then fail closed instead of occupying the common pool.
 */
@Component
public class TimedModelCall {

  private static final Logger log = LoggerFactory.getLogger(TimedModelCall.class);

  /**
   * Bounds platform threads stuck in a provider call that ignores interruption. Sixteen covers
   * classroom concurrency; the queue holds the same number of not-yet-started calls.
   */
  private static final int MODEL_CALL_THREADS = 16;

  private static final int MODEL_CALL_QUEUE = 16;

  private static final ThreadPoolExecutor MODEL_CALLS = newModelCallExecutor();

  private final WebClient aiWebClient;
  private final AiTimeouts timeouts;

  public TimedModelCall(WebClient aiWebClient, AiTimeouts timeouts) {
    this.aiWebClient = aiWebClient;
    this.timeouts = timeouts;
  }

  public WebClient aiWebClient() {
    return aiWebClient;
  }

  public AIResponse request(Supplier<AIResponse> call) {
    return request(timeouts.connectTimeoutMs(), timeouts.responseTimeoutMs(), call);
  }

  public static AIResponse request(int connectTimeoutMs, int responseTimeoutMs, Supplier<AIResponse> call) {
    long totalMs = (long) connectTimeoutMs + responseTimeoutMs;
    Future<AIResponse> future = submit(call);
    try {
      return future.get(totalMs, TimeUnit.MILLISECONDS);
    } catch (TimeoutException ex) {
      stop(future);
      throw ModelFailureException.timeout();
    } catch (InterruptedException ex) {
      stop(future);
      Thread.currentThread().interrupt();
      throw ModelFailureException.providerFailed();
    } catch (ExecutionException ex) {
      throw failure(ex.getCause() != null ? ex.getCause() : ex);
    } catch (CancellationException ex) {
      throw ModelFailureException.providerFailed();
    }
  }

  private static Future<AIResponse> submit(Supplier<AIResponse> call) {
    try {
      return MODEL_CALLS.submit(call::get);
    } catch (RejectedExecutionException ex) {
      throw ModelFailureException.timeout();
    }
  }

  /** Interrupt a running call and drop a queued one so it cannot outlive the timeout. */
  private static void stop(Future<?> future) {
    future.cancel(true);
    if (future instanceof Runnable runnable) {
      MODEL_CALLS.remove(runnable);
    }
  }

  private static RuntimeException failure(Throwable cause) {
    if (cause instanceof ModelFailureException modelFailure) {
      return modelFailure;
    }
    log.error(
        "AI provider call failed: type={}, message={}",
        cause.getClass().getName(),
        cause.getMessage());
    return ModelFailureException.providerFailed();
  }

  private static ThreadPoolExecutor newModelCallExecutor() {
    ThreadPoolExecutor executor =
        new ThreadPoolExecutor(
            MODEL_CALL_THREADS,
            MODEL_CALL_THREADS,
            30L,
            TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(MODEL_CALL_QUEUE),
            daemonFactory(),
            new ThreadPoolExecutor.AbortPolicy());
    executor.allowCoreThreadTimeOut(true);
    return executor;
  }

  private static ThreadFactory daemonFactory() {
    AtomicInteger sequence = new AtomicInteger();
    return runnable -> {
      Thread thread = new Thread(runnable, "ai-model-call-" + sequence.incrementAndGet());
      thread.setDaemon(true);
      return thread;
    };
  }
}
