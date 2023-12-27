import { ContinuousEventPriority, DefaultEventPriority, DiscreteEventPriority, IdleEventPriority, lanesToEventPriority } from './ReactEventPriorities';
import { Lane, Lanes, NoLane, NoLanes, getNextLanes } from './ReactFiberLane';
import {
  getWorkInProgressRoot,
  getWorkInProgressRootRenderLanes,
  performConcurrentWorkOnRoot,
} from './ReactFiberWorkLoop';
import {
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
  cancelCallback as Scheduler_cancelCallback,
  scheduleCallback,
  now,
} from './Scheduler';

export function ensureRootIsScheduled(root): void {
    scheduleTaskForRootDuringMicrotask(root, now());
}

function scheduleTaskForRootDuringMicrotask(
  root,
  currentTime: number,
) {
  // This function is always called inside a microtask, or at the very end of a
  // rendering task right before we yield to the main thread. It should never be
  // called synchronously.
  //
  // TODO: Unless enableDeferRootSchedulingToMicrotask is off. We need to land
  // that ASAP to unblock additional features we have planned.
  //
  // This function also never performs React work synchronously; it should
  // only schedule work to be performed later, in a separate task or microtask.

  // Check if any lanes are being starved by other work. If so, mark them as
  // expired so we know to work on those next.
  // markStarvedLanesAsExpired(root, currentTime);

  // Determine the next lanes to work on, and their priority.
  const workInProgressRoot = getWorkInProgressRoot();
  const workInProgressRootRenderLanes = getWorkInProgressRootRenderLanes();
  const nextLanes = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,
  );

  const existingCallbackNode = root.callbackNode;
  if (
    // Check if there's nothing to work on
    // nextLanes === NoLanes ||
    // If this root is currently suspended and waiting for data to resolve, don't
    // schedule a task to render it. We'll either wait for a ping, or wait to
    // receive an update.
    //
    // Suspended render phase
    // (root === workInProgressRoot && isWorkLoopSuspendedOnData()) ||
    // Suspended commit phase
    root.cancelPendingCommit !== null
  ) {
    // Fast path: There's nothing to work on.
    if (existingCallbackNode !== null) {
      // cancelCallback(existingCallbackNode);
    }
    root.callbackNode = null;
    root.callbackPriority = NoLane;
    return NoLane;
  }

  // Schedule a new callback in the host environment.
  // if (includesSyncLane(nextLanes)) {
  //   // Synchronous work is always flushed at the end of the microtask, so we
  //   // don't need to schedule an additional task.
  //   if (existingCallbackNode !== null) {
  //     cancelCallback(existingCallbackNode);
  //   }
  //   root.callbackPriority = SyncLane;
  //   root.callbackNode = null;
  //   return SyncLane;
  // } else {
    // We use the highest priority lane to represent the priority of the callback.
    const existingCallbackPriority = root.callbackPriority;
    // const newCallbackPriority = getHighestPriorityLane(nextLanes);

    // if (
    //   newCallbackPriority === existingCallbackPriority &&
    //   // Special case related to `act`. If the currently scheduled task is a
    //   // Scheduler task, rather than an `act` task, cancel it and re-schedule
    //   // on the `act` queue.
    // ) {
    //   // The priority hasn't changed. We can reuse the existing task.
    //   return newCallbackPriority;
    // } else {
    //   // Cancel the existing callback. We'll schedule a new one below.
    //   // cancelCallback(existingCallbackNode);
    // }

    let schedulerPriorityLevel;
    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        console.log('ImmediateSchedulerPriority', ImmediateSchedulerPriority)
        schedulerPriorityLevel = ImmediateSchedulerPriority;
        break;
      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingSchedulerPriority;
        break;
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
      case IdleEventPriority:
        schedulerPriorityLevel = IdleSchedulerPriority;
        break;
      default:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
    }

    const newCallbackNode = scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
    );

    // root.callbackPriority = newCallbackPriority;
    root.callbackNode = newCallbackNode;
    // return newCallbackPriority;
  // }
}