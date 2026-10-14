package com.manager.exception;

/** Python {@code ProviderMaintenanceError}. */
public class ProviderMaintenanceError extends ProviderServiceError {
    public ProviderMaintenanceError(String message) {
        super(message);
    }

    public ProviderMaintenanceError(String message, String provider) {
        super(message, provider);
    }
}
