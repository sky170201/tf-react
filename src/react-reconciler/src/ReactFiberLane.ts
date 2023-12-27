import { enableUnifiedSyncLane } from "shared/ReactFeatureFlags";
import { ConcurrentUpdate } from "./ReactFiberConcurrentUpdates";
import { clz32 } from "./clz32";

export type Lanes = number;
export type Lane = number;
export type LaneMap<T> = Array<T>;

export const TotalLanes = 31;

export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

export const SyncHydrationLane: Lane = /*               */ 0b0000000000000000000000000000001;
export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000010;
export const SyncLaneIndex: number = 1;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000100;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000001000;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000010000;
export const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000100000;

export const SyncUpdateLanes: Lane = enableUnifiedSyncLane
  ? SyncLane | InputContinuousLane | DefaultLane
  : SyncLane;

const TransitionHydrationLane: Lane = /*                */ 0b0000000000000000000000001000000;
const TransitionLanes: Lanes = /*                       */ 0b0000000001111111111111110000000;
const TransitionLane1: Lane = /*                        */ 0b0000000000000000000000010000000;
const TransitionLane2: Lane = /*                        */ 0b0000000000000000000000100000000;
const TransitionLane3: Lane = /*                        */ 0b0000000000000000000001000000000;
const TransitionLane4: Lane = /*                        */ 0b0000000000000000000010000000000;
const TransitionLane5: Lane = /*                        */ 0b0000000000000000000100000000000;
const TransitionLane6: Lane = /*                        */ 0b0000000000000000001000000000000;
const TransitionLane7: Lane = /*                        */ 0b0000000000000000010000000000000;
const TransitionLane8: Lane = /*                        */ 0b0000000000000000100000000000000;
const TransitionLane9: Lane = /*                        */ 0b0000000000000001000000000000000;
const TransitionLane10: Lane = /*                       */ 0b0000000000000010000000000000000;
const TransitionLane11: Lane = /*                       */ 0b0000000000000100000000000000000;
const TransitionLane12: Lane = /*                       */ 0b0000000000001000000000000000000;
const TransitionLane13: Lane = /*                       */ 0b0000000000010000000000000000000;
const TransitionLane14: Lane = /*                       */ 0b0000000000100000000000000000000;
const TransitionLane15: Lane = /*                       */ 0b0000000001000000000000000000000;

const RetryLanes: Lanes = /*                            */ 0b0000011110000000000000000000000;
const RetryLane1: Lane = /*                             */ 0b0000000010000000000000000000000;
const RetryLane2: Lane = /*                             */ 0b0000000100000000000000000000000;
const RetryLane3: Lane = /*                             */ 0b0000001000000000000000000000000;
const RetryLane4: Lane = /*                             */ 0b0000010000000000000000000000000;

export const SomeRetryLane: Lane = RetryLane1;

export const SelectiveHydrationLane: Lane = /*          */ 0b0000100000000000000000000000000;

const NonIdleLanes: Lanes = /*                          */ 0b0000111111111111111111111111111;

export const IdleHydrationLane: Lane = /*               */ 0b0001000000000000000000000000000;
export const IdleLane: Lane = /*                        */ 0b0010000000000000000000000000000;

export const OffscreenLane: Lane = /*                   */ 0b0100000000000000000000000000000;
export const DeferredLane: Lane = /*                    */ 0b1000000000000000000000000000000;

// Any lane that might schedule an update. This is used to detect infinite
// update loops, so it doesn't include hydration lanes or retries.
export const UpdateLanes: Lanes =
  SyncLane | InputContinuousLane | DefaultLane | TransitionLanes;

export const NoTimestamp = -1;

export function createLaneMap<T>(initial: T): LaneMap<T> {
  // Intentionally pushing one by one.
  // https://v8.dev/blog/elements-kinds#avoid-creating-holes
  const laneMap: LaneMap<T> = [];
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial);
  }
  return laneMap;
}

export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
  return a | b;
}

function pickArbitraryLaneIndex(lanes: Lanes) {
  return 31 - clz32(lanes);
}

function laneToIndex(lane: Lane) {
  return pickArbitraryLaneIndex(lane);
}

export function markHiddenUpdate(
  root: any,
  update: ConcurrentUpdate,
  lane: Lane,
) {
  const index = laneToIndex(lane);
  const hiddenUpdates = root.hiddenUpdates;
  const hiddenUpdatesForLane = hiddenUpdates[index];
  if (hiddenUpdatesForLane === null) {
    hiddenUpdates[index] = [update];
  } else {
    hiddenUpdatesForLane.push(update);
  }
  update.lane = lane | OffscreenLane;
}

export function isSubsetOfLanes(set: Lanes, subset: Lanes | Lane): boolean {
  return (set & subset) === subset;
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes;
}

export function includesNonIdleWork(lanes: Lanes): boolean {
  return (lanes & NonIdleLanes) !== NoLanes;
}

export function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes {
  return set & ~subset;
}

export function includesSyncLane(lanes: Lanes): boolean {
  return (lanes & (SyncLane | SyncHydrationLane)) !== NoLanes;
}

function getHighestPriorityLanes(lanes: Lanes | Lane): Lanes {
  if (enableUnifiedSyncLane) {
    const pendingSyncLanes = lanes & SyncUpdateLanes;
    if (pendingSyncLanes !== 0) {
      return pendingSyncLanes;
    }
  }
  switch (getHighestPriorityLane(lanes)) {
    case SyncHydrationLane:
      return SyncHydrationLane;
    case SyncLane:
      return SyncLane;
    case InputContinuousHydrationLane:
      return InputContinuousHydrationLane;
    case InputContinuousLane:
      return InputContinuousLane;
    case DefaultHydrationLane:
      return DefaultHydrationLane;
    case DefaultLane:
      return DefaultLane;
    case TransitionHydrationLane:
      return TransitionHydrationLane;
    case TransitionLane1:
    case TransitionLane2:
    case TransitionLane3:
    case TransitionLane4:
    case TransitionLane5:
    case TransitionLane6:
    case TransitionLane7:
    case TransitionLane8:
    case TransitionLane9:
    case TransitionLane10:
    case TransitionLane11:
    case TransitionLane12:
    case TransitionLane13:
    case TransitionLane14:
    case TransitionLane15:
      return lanes & TransitionLanes;
    case RetryLane1:
    case RetryLane2:
    case RetryLane3:
    case RetryLane4:
      return lanes & RetryLanes;
    case SelectiveHydrationLane:
      return SelectiveHydrationLane;
    case IdleHydrationLane:
      return IdleHydrationLane;
    case IdleLane:
      return IdleLane;
    case OffscreenLane:
      return OffscreenLane;
    case DeferredLane:
      // This shouldn't be reachable because deferred work is always entangled
      // with something else.
      return NoLanes;
    default:
      // This shouldn't be reachable, but as a fallback, return the entire bitmask.
      return lanes;
  }
}

export function getNextLanes(root: any, wipLanes: Lanes): Lanes {
  // Early bailout if there's no pending work left.
  const pendingLanes = root.pendingLanes;
  if (pendingLanes === NoLanes) {
    return NoLanes;
  }

  let nextLanes = NoLanes;

  const suspendedLanes = root.suspendedLanes;
  const pingedLanes = root.pingedLanes;

  // Do not work on any idle work until all the non-idle work has finished,
  // even if the work is suspended.
  const nonIdlePendingLanes = pendingLanes & NonIdleLanes;
  if (nonIdlePendingLanes !== NoLanes) {
    const nonIdleUnblockedLanes = nonIdlePendingLanes & ~suspendedLanes;
    if (nonIdleUnblockedLanes !== NoLanes) {
      nextLanes = getHighestPriorityLanes(nonIdleUnblockedLanes);
    } else {
      const nonIdlePingedLanes = nonIdlePendingLanes & pingedLanes;
      if (nonIdlePingedLanes !== NoLanes) {
        nextLanes = getHighestPriorityLanes(nonIdlePingedLanes);
      }
    }
  } else {
    // The only remaining work is Idle.
    const unblockedLanes = pendingLanes & ~suspendedLanes;
    if (unblockedLanes !== NoLanes) {
      nextLanes = getHighestPriorityLanes(unblockedLanes);
    } else {
      if (pingedLanes !== NoLanes) {
        nextLanes = getHighestPriorityLanes(pingedLanes);
      }
    }
  }

  if (nextLanes === NoLanes) {
    // This should only be reachable if we're suspended
    // TODO: Consider warning in this path if a fallback timer is not scheduled.
    return NoLanes;
  }

  // If we're already in the middle of a render, switching lanes will interrupt
  // it and we'll lose our progress. We should only do this if the new lanes are
  // higher priority.
  if (
    wipLanes !== NoLanes &&
    wipLanes !== nextLanes &&
    // If we already suspended with a delay, then interrupting is fine. Don't
    // bother waiting until the root is complete.
    (wipLanes & suspendedLanes) === NoLanes
  ) {
    const nextLane = getHighestPriorityLane(nextLanes);
    const wipLane = getHighestPriorityLane(wipLanes);
    if (
      // Tests whether the next lane is equal or lower priority than the wip
      // one. This works because the bits decrease in priority as you go left.
      nextLane >= wipLane ||
      // Default priority updates should not interrupt transition updates. The
      // only difference between default updates and transition updates is that
      // default updates do not support refresh transitions.
      (nextLane === DefaultLane && (wipLane & TransitionLanes) !== NoLanes)
    ) {
      // Keep working on the existing in-progress tree. Do not interrupt.
      return wipLanes;
    }
  }

  return nextLanes;
}

export function markRootFinished(
  root: any,
  remainingLanes: Lanes,
  spawnedLane: Lane = NoLane,
) {
  const noLongerPendingLanes = root.pendingLanes & ~remainingLanes;

  root.pendingLanes = remainingLanes;

  // Let's try everything again
  root.suspendedLanes = NoLanes;
  root.pingedLanes = NoLanes;

  root.expiredLanes &= remainingLanes;

  root.entangledLanes &= remainingLanes;

  root.errorRecoveryDisabledLanes &= remainingLanes;
  root.shellSuspendCounter = 0;

  const entanglements = root.entanglements;
  const expirationTimes = root.expirationTimes;
  const hiddenUpdates = root.hiddenUpdates;

  // Clear the lanes that no longer have pending work
  let lanes = noLongerPendingLanes;
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;

    entanglements[index] = NoLanes;
    expirationTimes[index] = NoTimestamp;

    const hiddenUpdatesForLane = hiddenUpdates[index];
    if (hiddenUpdatesForLane !== null) {
      hiddenUpdates[index] = null;
      // "Hidden" updates are updates that were made to a hidden component. They
      // have special logic associated with them because they may be entangled
      // with updates that occur outside that tree. But once the outer tree
      // commits, they behave like regular updates.
      for (let i = 0; i < hiddenUpdatesForLane.length; i++) {
        const update = hiddenUpdatesForLane[i];
        if (update !== null) {
          update.lane &= ~OffscreenLane;
        }
      }
    }

    lanes &= ~lane;
  }

  if (spawnedLane !== NoLane) {
    markSpawnedDeferredLane(
      root,
      spawnedLane,
      // This render finished successfully without suspending, so we don't need
      // to entangle the spawned task with the parent task.
      NoLanes,
    );
  }
}

function markSpawnedDeferredLane(
  root: any,
  spawnedLane: Lane,
  entangledLanes: Lanes,
) {
  // This render spawned a deferred task. Mark it as pending.
  root.pendingLanes |= spawnedLane;
  root.suspendedLanes &= ~spawnedLane;

  // Entangle the spawned lane with the DeferredLane bit so that we know it
  // was the result of another render. This lets us avoid a useDeferredValue
  // waterfall — only the first level will defer.
  const spawnedLaneIndex = laneToIndex(spawnedLane);
  root.entangledLanes |= spawnedLane;
  root.entanglements[spawnedLaneIndex] |=
    DeferredLane |
    // If the parent render task suspended, we must also entangle those lanes
    // with the spawned task, so that the deferred task includes all the same
    // updates that the parent task did. We can exclude any lane that is not
    // used for updates (e.g. Offscreen).
    (entangledLanes & UpdateLanes);
}
