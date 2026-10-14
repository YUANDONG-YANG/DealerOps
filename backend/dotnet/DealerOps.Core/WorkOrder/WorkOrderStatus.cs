namespace DealerOps.Core.WorkOrder;

public enum WorkOrderStatus
{
    Open,
    InProgress,
    Done,
    Cancelled
}

public static class WorkOrderStatusExtensions
{
    public static readonly IReadOnlyList<WorkOrderStatus> OpenStatuses =
        [WorkOrderStatus.Open, WorkOrderStatus.InProgress];

    public static bool IsClosed(this WorkOrderStatus status) =>
        status is WorkOrderStatus.Done or WorkOrderStatus.Cancelled;

    public static bool CanMoveTo(this WorkOrderStatus current, WorkOrderStatus next) => current switch
    {
        WorkOrderStatus.Open => next is WorkOrderStatus.InProgress or WorkOrderStatus.Done or WorkOrderStatus.Cancelled,
        WorkOrderStatus.InProgress => next is WorkOrderStatus.Done or WorkOrderStatus.Cancelled,
        _ => false
    };
}
