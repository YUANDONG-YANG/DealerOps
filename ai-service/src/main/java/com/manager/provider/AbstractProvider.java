package com.manager.provider;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public abstract class AbstractProvider implements BaseAIProvider {

    protected String model;
    protected String apiKey;

    protected AbstractProvider(String model, String apiKey) {
        this.model = model;
        this.apiKey = apiKey;
    }
}
