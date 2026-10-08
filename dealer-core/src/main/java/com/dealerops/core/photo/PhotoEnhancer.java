package com.dealerops.core.photo;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Image processing for Image Studio, using only the JDK image APIs. The text-only AI library is
 * not involved: presets are deterministic contrast, gamma, and sharpening operations.
 */
@Component
public class PhotoEnhancer {

  /** Refuse to decode images above this pixel count, before allocating the bitmap. */
  private static final long MAX_DECODE_PIXELS = 40_000_000L;

  private static final float JPEG_QUALITY = 0.9f;
  private static final double BRIGHTEN_GAMMA = 0.8;

  private final int maxEdgePx;

  public PhotoEnhancer(@Value("${dealerops.photos.max-edge-px:1600}") int maxEdgePx) {
    this.maxEdgePx = maxEdgePx;
  }

  /** Detects the real format from the bytes: {@code image/jpeg} or {@code image/png}, else 415. */
  public String detectContentType(byte[] data) {
    try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
      Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
      if (readers != null && readers.hasNext()) {
        String format = readers.next().getFormatName().toLowerCase(Locale.ROOT);
        if (format.equals("jpeg") || format.equals("jpg")) {
          return "image/jpeg";
        }
        if (format.equals("png")) {
          return "image/png";
        }
      }
    } catch (IOException ex) {
      // fall through to the unsupported-type error
    }
    throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Photo must be a JPEG or PNG image.");
  }

  /** Returns a JPEG of the original with the preset applied, scaled to the configured edge. */
  public byte[] enhance(byte[] original, PhotoPreset preset) {
    BufferedImage image = toRgb(scale(decode(original)));
    BufferedImage result =
        switch (preset) {
          case AUTO -> autoLevels(image);
          case BRIGHTEN -> brighten(image);
          case SHARPEN -> sharpen(image);
        };
    return writeJpeg(result);
  }

  private static BufferedImage decode(byte[] data) {
    try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
      Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
      if (!readers.hasNext()) {
        throw unreadable();
      }
      ImageReader reader = readers.next();
      try {
        reader.setInput(in, true, true);
        if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_DECODE_PIXELS) {
          throw new ApiException(ErrorCode.VALIDATION, "Photo dimensions are too large.");
        }
        return reader.read(0);
      } finally {
        reader.dispose();
      }
    } catch (IOException ex) {
      throw unreadable();
    }
  }

  private BufferedImage scale(BufferedImage source) {
    int longEdge = Math.max(source.getWidth(), source.getHeight());
    if (longEdge <= maxEdgePx) {
      return source;
    }
    double ratio = (double) maxEdgePx / longEdge;
    int width = Math.max(1, (int) Math.round(source.getWidth() * ratio));
    int height = Math.max(1, (int) Math.round(source.getHeight() * ratio));
    BufferedImage scaled = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = scaled.createGraphics();
    try {
      g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
      g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
      g.drawImage(source, 0, 0, width, height, Color.WHITE, null);
    } finally {
      g.dispose();
    }
    return scaled;
  }

  /** JPEG has no alpha channel, so transparent PNG areas become white. */
  private static BufferedImage toRgb(BufferedImage source) {
    if (source.getType() == BufferedImage.TYPE_INT_RGB) {
      return source;
    }
    BufferedImage rgb = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
    Graphics2D g = rgb.createGraphics();
    try {
      g.drawImage(source, 0, 0, Color.WHITE, null);
    } finally {
      g.dispose();
    }
    return rgb;
  }

  private static BufferedImage autoLevels(BufferedImage image) {
    int[] pixels = image.getRGB(0, 0, image.getWidth(), image.getHeight(), null, 0, image.getWidth());
    int[] histogram = new int[256];
    for (int p : pixels) {
      histogram[luminance(p)]++;
    }
    int clip = pixels.length / 100;
    int low = percentile(histogram, clip, false);
    int high = percentile(histogram, clip, true);
    if (high - low < 10) {
      return image;
    }
    int[] table = new int[256];
    for (int v = 0; v < 256; v++) {
      table[v] = clamp((v - low) * 255 / (high - low));
    }
    return apply(image, pixels, table);
  }

  private static BufferedImage brighten(BufferedImage image) {
    int[] pixels = image.getRGB(0, 0, image.getWidth(), image.getHeight(), null, 0, image.getWidth());
    int[] table = new int[256];
    for (int v = 0; v < 256; v++) {
      table[v] = clamp((int) Math.round(255 * Math.pow(v / 255.0, BRIGHTEN_GAMMA)));
    }
    return apply(image, pixels, table);
  }

  private static BufferedImage sharpen(BufferedImage image) {
    float[] kernel = {0f, -1f, 0f, -1f, 5f, -1f, 0f, -1f, 0f};
    ConvolveOp op = new ConvolveOp(new Kernel(3, 3, kernel), ConvolveOp.EDGE_NO_OP, null);
    BufferedImage target = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
    return op.filter(image, target);
  }

  private static BufferedImage apply(BufferedImage image, int[] pixels, int[] table) {
    for (int i = 0; i < pixels.length; i++) {
      int p = pixels[i];
      pixels[i] =
          (table[(p >> 16) & 0xff] << 16) | (table[(p >> 8) & 0xff] << 8) | table[p & 0xff];
    }
    BufferedImage out = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
    out.setRGB(0, 0, image.getWidth(), image.getHeight(), pixels, 0, image.getWidth());
    return out;
  }

  private static int percentile(int[] histogram, int clip, boolean fromTop) {
    int seen = 0;
    for (int i = 0; i < 256; i++) {
      int index = fromTop ? 255 - i : i;
      seen += histogram[index];
      if (seen > clip) {
        return index;
      }
    }
    return fromTop ? 255 : 0;
  }

  private static int luminance(int p) {
    int r = (p >> 16) & 0xff;
    int g = (p >> 8) & 0xff;
    int b = p & 0xff;
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  private static int clamp(int v) {
    return Math.max(0, Math.min(255, v));
  }

  private static byte[] writeJpeg(BufferedImage image) {
    ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    try (ImageOutputStream out = ImageIO.createImageOutputStream(bytes)) {
      writer.setOutput(out);
      ImageWriteParam param = writer.getDefaultWriteParam();
      param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
      param.setCompressionQuality(JPEG_QUALITY);
      writer.write(null, new IIOImage(image, null, null), param);
    } catch (IOException ex) {
      throw new ApiException(ErrorCode.INTERNAL_ERROR, "Could not save the enhanced photo.");
    } finally {
      writer.dispose();
    }
    return bytes.toByteArray();
  }

  private static ApiException unreadable() {
    return new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Photo must be a JPEG or PNG image.");
  }
}
