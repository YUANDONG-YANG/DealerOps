namespace DealerOps.Core.WorkOrder;

/// <summary>Work-order lifecycle (WO-02); <c>Done</c> and <c>Cancelled</c> are final.</summary>
public enum WorkOrderStatus
{
    Open,
    InProgress,
    Done,
    Cancelled
}

/// <summary>Lifecycle rules for <see cref="WorkOrderStatus"/>.</summary>
public static class WorkOrderStatusExtensions
{
    /// <summary>True for the final states <c>Done</c> and <c>Cancelled</c>.</summary>
    public static bool IsClosed(this WorkOrderStatus status) =>
        status is WorkOrderStatus.Done or WorkOrderStatus.Cancelled;

    /// <summary>Whether WO-02 allows moving from <paramref name="current"/> to <paramref name="next"/>.</summary>
    public static bool CanMoveTo(this WorkOrderStatus current, WorkOrderStatus next) => current switch
    {
        WorkOrderStatus.Open => next is WorkOrderStatus.InProgress or WorkOrderStatus.Done or WorkOrderStatus.Cancelled,
        WorkOrderStatus.InProgress => next is WorkOrderStatus.Done or WorkOrderStatus.Cancelled,
        _ => false
    };
}
