using DealerOps.Core.Common.Exceptions;
using SkiaSharp;

namespace DealerOps.Core.Photo;

/// <summary>
/// Detects photo formats and renders enhanced JPEG variants with SkiaSharp. Unreadable or oversized
/// images raise <see cref="ApiException"/>; the caller logs and audits the outcome.
/// </summary>
public class PhotoEnhancer
{
    private const long MaxDecodePixels = 40_000_000L;
    private const int JpegQuality = 90;
    private const double BrightenGamma = 0.8;

    private readonly int _maxEdgePx;

    public PhotoEnhancer(IConfiguration config)
    {
        _maxEdgePx = config.GetValue("Photos:MaxEdgePx", 1600);
    }

    /// <summary>Returns image/jpeg or image/png for supported uploads; otherwise throws 415.</summary>
    public string DetectContentType(byte[] data)
    {
        using var codec = SKCodec.Create(new MemoryStream(data));
        if (codec == null)
            throw new ApiException(ErrorCode.UnsupportedMediaType, "Photo must be a JPEG or PNG image.");

        return codec.EncodedFormat switch
        {
            SKEncodedImageFormat.Jpeg => "image/jpeg",
            SKEncodedImageFormat.Png => "image/png",
            _ => throw new ApiException(ErrorCode.UnsupportedMediaType, "Photo must be a JPEG or PNG image.")
        };
    }

    /// <summary>
    /// Decodes the original, scales it to the configured long edge, applies <paramref name="preset"/>
    /// and returns the JPEG-encoded result.
    /// </summary>
    public byte[] Enhance(byte[] original, PhotoPreset preset)
    {
        using var bitmap = Decode(original);
        var scaled = Scale(bitmap);
        var result = preset switch
        {
            PhotoPreset.Auto => AutoLevels(scaled),
            PhotoPreset.Brighten => Brighten(scaled),
            PhotoPreset.Sharpen => Sharpen(scaled),
            _ => scaled
        };

        using var image = SKImage.FromBitmap(result);
        using var encoded = image.Encode(SKEncodedImageFormat.Jpeg, JpegQuality);
        if (result != scaled) result.Dispose();
        if (scaled != bitmap) scaled.Dispose();
        return encoded.ToArray();
    }

    private static SKBitmap Decode(byte[] data)
    {
        using var codec = SKCodec.Create(new MemoryStream(data))
                          ?? throw Unreadable();

        if ((long)codec.Info.Width * codec.Info.Height > MaxDecodePixels)
            throw new ApiException(ErrorCode.Validation, "Photo dimensions are too large.");

        using var decoded = SKBitmap.Decode(data) ?? throw Unreadable();

        // JPEG output has no alpha channel, so PNG transparency is flattened onto white.
        var bitmap = new SKBitmap(decoded.Width, decoded.Height);
        using var canvas = new SKCanvas(bitmap);
        canvas.Clear(SKColors.White);
        canvas.DrawBitmap(decoded, 0, 0);
        return bitmap;
    }

    private SKBitmap Scale(SKBitmap source)
    {
        var longEdge = Math.Max(source.Width, source.Height);
        if (longEdge <= _maxEdgePx) return source;

        var ratio = (double)_maxEdgePx / longEdge;
        var width = Math.Max(1, (int)Math.Round(source.Width * ratio));
        var height = Math.Max(1, (int)Math.Round(source.Height * ratio));

        return source.Resize(new SKImageInfo(width, height), SKFilterQuality.High);
    }

    private static SKBitmap AutoLevels(SKBitmap bitmap)
    {
        var pixels = bitmap.Pixels;
        var histogram = new int[256];
        foreach (var p in pixels)
            histogram[Luminance(p)]++;

        var clip = pixels.Length / 100;
        var low = Percentile(histogram, clip, false);
        var high = Percentile(histogram, clip, true);
        if (high - low < 10) return bitmap;

        var table = new byte[256];
        for (var v = 0; v < 256; v++)
            table[v] = (byte)Math.Clamp((v - low) * 255 / (high - low), 0, 255);

        return ApplyTable(bitmap, pixels, table);
    }

    private static SKBitmap Brighten(SKBitmap bitmap)
    {
        var pixels = bitmap.Pixels;
        var table = new byte[256];
        for (var v = 0; v < 256; v++)
            table[v] = (byte)Math.Clamp((int)Math.Round(255 * Math.Pow(v / 255.0, BrightenGamma)), 0, 255);
        return ApplyTable(bitmap, pixels, table);
    }

    private static SKBitmap Sharpen(SKBitmap bitmap)
    {
        float[] kernel = [0f, -1f, 0f, -1f, 5f, -1f, 0f, -1f, 0f];
        using var filter = SKImageFilter.CreateMatrixConvolution(
            new SKSizeI(3, 3), kernel, 1f, 0f, new SKPointI(1, 1),
            SKShaderTileMode.Clamp, false);
        using var paint = new SKPaint { ImageFilter = filter };

        var result = new SKBitmap(bitmap.Width, bitmap.Height);
        using var canvas = new SKCanvas(result);
        canvas.DrawBitmap(bitmap, 0, 0, paint);
        return result;
    }

    private static SKBitmap ApplyTable(SKBitmap bitmap, SKColor[] pixels, byte[] table)
    {
        var result = new SKBitmap(bitmap.Width, bitmap.Height);
        var newPixels = new SKColor[pixels.Length];
        for (var i = 0; i < pixels.Length; i++)
        {
            var p = pixels[i];
            newPixels[i] = new SKColor(table[p.Red], table[p.Green], table[p.Blue], p.Alpha);
        }
        result.Pixels = newPixels;
        return result;
    }

    private static int Luminance(SKColor p) => (p.Red * 299 + p.Green * 587 + p.Blue * 114) / 1000;

    private static int Percentile(int[] histogram, int clip, bool fromTop)
    {
        var seen = 0;
        for (var i = 0; i < 256; i++)
        {
            var index = fromTop ? 255 - i : i;
            seen += histogram[index];
            if (seen > clip) return index;
        }
        return fromTop ? 255 : 0;
    }

    private static ApiException Unreadable() =>
        new(ErrorCode.UnsupportedMediaType, "Photo must be a JPEG or PNG image.");
}
