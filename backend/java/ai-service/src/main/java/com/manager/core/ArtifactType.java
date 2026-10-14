package com.manager.core;

public enum ArtifactType {
    CODE("code"),
    SCRIPT("script"),
    DOCUMENT("document"),
    CONFIG("config"),
    DATA("data"),
    MARKUP("markup"),
    QUERY("query"),
    SCHEMA("schema"),
    TEST("test"),
    DOCUMENTATION("documentation");

    private final String value;

    ArtifactType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
