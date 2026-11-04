using System.Net;
using System.Net.Sockets;

namespace DealerOps.Core.Audit;

/// <summary>
/// Classifies a client address before any external lookup. Non-routable addresses stay on the
/// server and are labeled as local; they are never given a city or a quadrant.
/// </summary>
internal static class IpAddressPrivacy
{
    public const string LocalLabel = "Local or private network";

    /// <summary>
    /// The address to look up, or null when it is missing, unparseable, or not globally routable.
    /// IPv4-mapped IPv6 is reduced to IPv4. A zone index is ignored.
    /// </summary>
    public static string? RoutableAddress(string? ip)
    {
        if (!TryParse(ip, out var address)) return null;
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (IsNonRoutable(address)) return null;
        return address.ToString();
    }

    public static bool IsNonRoutable(string? ip)
    {
        if (!TryParse(ip, out var address)) return false;
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        return IsNonRoutable(address);
    }

    private static bool TryParse(string? ip, out IPAddress address)
    {
        address = IPAddress.None;
        if (string.IsNullOrWhiteSpace(ip)) return false;
        var text = ip.Trim();
        if (text.StartsWith('[') && text.Contains(']'))
            text = text[1..text.IndexOf(']')];
        var zone = text.IndexOf('%');
        if (zone >= 0) text = text[..zone];
        return IPAddress.TryParse(text, out address!);
    }

    private static bool IsNonRoutable(IPAddress address)
    {
        if (IPAddress.IsLoopback(address)) return true;
        if (address.AddressFamily == AddressFamily.InterNetwork) return IsNonRoutableV4(address);
        if (address.AddressFamily == AddressFamily.InterNetworkV6) return IsNonRoutableV6(address);
        return true;
    }

    private static bool IsNonRoutableV4(IPAddress address)
    {
        var b = address.GetAddressBytes();
        if (b[0] == 0 || b[0] == 10 || b[0] == 127) return true;
        if (b[0] == 100 && b[1] >= 64 && b[1] <= 127) return true;
        if (b[0] == 169 && b[1] == 254) return true;
        if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return true;
        if (b[0] == 192 && b[1] == 0 && (b[2] == 0 || b[2] == 2)) return true;
        if (b[0] == 192 && b[1] == 168) return true;
        if (b[0] == 198 && (b[1] == 18 || b[1] == 19)) return true;
        if (b[0] == 198 && b[1] == 51 && b[2] == 100) return true;
        if (b[0] == 203 && b[1] == 0 && b[2] == 113) return true;
        return b[0] >= 224;
    }

    private static bool IsNonRoutableV6(IPAddress address)
    {
        if (address.Equals(IPAddress.IPv6Any) || address.Equals(IPAddress.IPv6None)) return true;
        var b = address.GetAddressBytes();
        if ((b[0] & 0xfe) == 0xfc) return true;
        if (b[0] == 0xfe && (b[1] & 0xc0) == 0x80) return true;
        if (b[0] == 0xff) return true;
        if (b[0] == 0x20 && b[1] == 0x01 && b[2] == 0x0d && b[3] == 0xb8) return true;
        return b[0] == 0x01 && b[1] == 0 && b[2] == 0 && b[3] == 0
            && b[4] == 0 && b[5] == 0 && b[6] == 0 && b[7] == 0;
    }
}
