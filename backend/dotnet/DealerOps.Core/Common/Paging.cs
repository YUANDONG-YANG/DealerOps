namespace DealerOps.Core.Common;

public static class Paging
{
    public static int ClampPage(int page) => Math.Max(0, page);

    public static int ClampSize(int size) => size <= 0 ? 10 : Math.Min(size, 100);
}
