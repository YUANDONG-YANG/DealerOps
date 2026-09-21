package ca.sait.dealerops.aiservice.support;

import com.manager.core.AIResponse;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

public final class TimedModelCall {
  private TimedModelCall() {}

  public static AIResponse request(long timeoutMs, Supplier<AIResponse> call) {
    try {
      return CompletableFuture.supplyAsync(call)
          .orTimeout(timeoutMs, TimeUnit.MILLISECONDS)
          .join();
    } catch (CompletionException ex) {
      Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
      if (cause instanceof TimeoutException) {
        throw ModelFailureException.timeout();
      }
      if (cause instanceof ModelFailureException mfe) {
        throw mfe;
      }
      throw ModelFailureException.providerFailed();
    }
  }
}
