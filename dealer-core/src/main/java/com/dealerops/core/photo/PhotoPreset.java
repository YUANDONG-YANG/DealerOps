package com.dealerops.core.photo;

/** Image Studio enhancement presets (design/21-Feature-Extensions.md §6). */
public enum PhotoPreset {
  /** Stretches contrast between the 1st and 99th luminance percentiles. */
  AUTO,
  /** Lifts mid-tones with a gamma curve. */
  BRIGHTEN,
  /** Sharpens edges with a 3x3 convolution. */
  SHARPEN
}
