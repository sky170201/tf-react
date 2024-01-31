import { Lane, Lanes, NoLanes } from "./ReactFiberLane";
import { Fiber } from "./ReactInternalTypes";
import { enqueueConcurrentClassUpdate, unsafe_markUpdateLaneFromFiberToRoot } from './ReactFiberConcurrentUpdates'
import { isUnsafeClassRenderPhaseUpdate } from "./ReactFiberWorkLoop";

export const UpdateState = 0;
export const ReplaceState = 1;
export const ForceUpdate = 2;
export const CaptureUpdate = 3;

export function initializeUpdateQueue(fiber: Fiber): void {
  const queue = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
      pending: null,
      lanes: NoLanes,
      hiddenCallbacks: null,
    },
    callbacks: null,
  };
  fiber.updateQueue = queue;
}

export function createUpdate(lane: Lane) {
  const update = {
    lane,

    tag: UpdateState,
    payload: null,
    callback: null,

    next: null,
  };
  return update;
}


export function enqueueUpdate<State>(
  fiber: Fiber,
  update,
  lane: Lane,
) {
  const updateQueue = fiber.updateQueue;
  if (updateQueue === null) {
    // Only occurs if the fiber has been unmounted.
    return null;
  }

  const sharedQueue = updateQueue.shared;

  if (isUnsafeClassRenderPhaseUpdate(fiber)) {
    // This is an unsafe render phase update. Add directly to the update
    // queue so we can process it immediately during the current render.
    const pending = sharedQueue.pending;
    if (pending === null) {
      // This is the first update. Create a circular list.
      update.next = update;
    } else {
      update.next = pending.next;
      pending.next = update;
    }
    sharedQueue.pending = update;

    // Update the childLanes even though we're most likely already rendering
    // this fiber. This is for backwards compatibility in the case where you
    // update a different component during render phase than the one that is
    // currently renderings (a pattern that is accompanied by a warning).
    return unsafe_markUpdateLaneFromFiberToRoot(fiber, lane);
  } else {
    return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
  }
}

export function
  processUpdateQueue(
    workInProgress: Fiber,
    props: any,
    instance: any,
    renderLanes: Lanes,
  ) {
  const queue = workInProgress.updateQueue;
  let pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    queue.shared.pending = null;
    const lastPendingUpdate = pendingQueue;
    const firstPendingUpdate = lastPendingUpdate.next;
    lastPendingUpdate.next = null;
    let newState = workInProgress.memoizedState
    let update = firstPendingUpdate
    while (update) {
      newState = getStateFromUpdate(
        update,
        newState,
        props,
        instance)
      update = update.next
    }
    workInProgress.memoizedState = newState
  }

}


function getStateFromUpdate<State>(
  update,
  prevState: State,
  nextProps: any,
  instance: any,
): any {
  switch (update.tag) {
    case UpdateState: {
      const payload = update.payload;
      let partialState;
      if (typeof payload === 'function') {
        partialState = payload.call(instance, prevState, nextProps);
      } else {
        // Partial state object
        partialState = payload;
      }
      if (partialState === null || partialState === undefined) {
        // Null and undefined are treated as no-ops.
        return prevState;
      }
      // Merge the partial state and the previous state.
      return Object.assign({}, prevState, partialState);
    }
  }
  return prevState;
}