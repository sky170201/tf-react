
import { Lane, Lanes, NoLane, NoLanes, SyncLane } from "./ReactFiberLane";
import { Fiber } from "./ReactInternalTypes";
import { createWorkInProgress } from './ReactFiber'
import {
  ensureRootIsScheduled,
} from './ReactFiberRootScheduler';
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from './ReactFiberCompleteWork';
import { BeforeMutationMask, LayoutMask, MutationMask, NoFlags, PassiveMask } from "./ReactFiberFlags";
import { unstable_requestPaint } from "scheduler/index";
import {
  commitBeforeMutationEffects,
  commitLayoutEffects,
  // commitLayoutEffects,
  commitMutationEffects,
} from './ReactFiberCommitWork';
import { finishQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
import { ConcurrentMode, NoMode } from "./ReactTypeOfMode";
import { getCurrentUpdatePriority } from "./ReactEventPriorities";
import { getCurrentEventPriority } from "react-dom-bindings/src/client/ReactFiberConfigDOM";

type ExecutionContext = number;

const RootInProgress = 0;
const RootCompleted = 5;

export const NoContext = /*             */ 0b000;
const BatchedContext = /*               */ 0b001;
export const RenderContext = /*         */ 0b010;
export const CommitContext = /*         */ 0b100;

// Describes where we are in the React execution stack
let executionContext: ExecutionContext = NoContext;
// The root we're working on
let workInProgressRoot = null;
// The fiber we're working on
let workInProgress: Fiber | null = null;

let workInProgressRootRenderLanes: Lanes = NoLanes;

type SuspendedReason = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
const NotSuspended: SuspendedReason = 0;
const SuspendedOnError: SuspendedReason = 1;
const SuspendedOnData: SuspendedReason = 2;
const SuspendedOnImmediate: SuspendedReason = 3;
const SuspendedOnInstance: SuspendedReason = 4;
const SuspendedOnInstanceAndReadyToContinue: SuspendedReason = 5;
const SuspendedOnDeprecatedThrowPromise: SuspendedReason = 6;
const SuspendedAndReadyToContinue: SuspendedReason = 7;
const SuspendedOnHydration: SuspendedReason = 8;

// When this is true, the work-in-progress fiber just suspended (or errored) and
// we've yet to unwind the stack. In some cases, we may yield to the main thread
// after this happens. If the fiber is pinged before we resume, we can retry
// immediately instead of unwinding the stack.
let workInProgressSuspendedReason: SuspendedReason = NotSuspended;
let workInProgressThrownValue = null;

// Whether a ping listener was attached during this render. This is slightly
// different that whether something suspended, because we don't add multiple
// listeners to a promise we've already seen (per root and lane).
let workInProgressRootDidAttachPingListener: boolean = false;

export let entangledRenderLanes: Lanes = NoLanes;


let workInProgressRootExitStatus = RootInProgress;
// A fatal error, if one is thrown
let workInProgressRootFatalError = null;
// The work left over by components that were visited during this render. Only
// includes unprocessed updates, not work in bailed out children.
let workInProgressRootSkippedLanes: Lanes = NoLanes;

// Lanes that were updated (in an interleaved event) during this render.
let workInProgressRootInterleavedUpdatedLanes: Lanes = NoLanes;
// Lanes that were updated during the render phase (*not* an interleaved event).
let workInProgressRootRenderPhaseUpdatedLanes: Lanes = NoLanes;
// Lanes that were pinged (in an interleaved event) during this render.
let workInProgressRootPingedLanes: Lanes = NoLanes;
// If this lane scheduled deferred work, this is the lane of the deferred task.
let workInProgressDeferredLane: Lane = NoLane;
// Errors that are thrown during the render phase.
let workInProgressRootConcurrentErrors: Array<any> | null =
  null;
// These are errors that we recovered from without surfacing them to the UI.
// We will log them once the tree commits.
let workInProgressRootRecoverableErrors: Array<any> | null =
  null;

export function scheduleUpdateOnFiber(
  root,
  fiber: Fiber,
  lane: Lane,
) {
  // Check if the work loop is currently suspended and waiting for data to
  // finish loading.
  if (
    // Suspended render phase
    (root === workInProgressRoot &&
      workInProgressSuspendedReason === SuspendedOnData) ||
    // Suspended commit phase
    root.cancelPendingCommit !== null
  ) {
    // The incoming update might unblock the current render. Interrupt the
    // current attempt and restart from the top.
    prepareFreshStack(root, NoLanes);
    // markRootSuspended(
    //   root,
    //   workInProgressRootRenderLanes,
    //   workInProgressDeferredLane,
    // );
  }

  // Mark that the root has a pending update.
  // markRootUpdated(root, lane);

  ensureRootIsScheduled(root);
  // if (
  // lane === SyncLane &&
  // executionContext === NoContext &&
  // (fiber.mode & ConcurrentMode) === NoMode
  // ) {
  // Flush the synchronous work now, unless we're already working or inside
  // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
  // scheduleCallbackForFiber to preserve the ability to schedule a callback
  // without immediately flushing it. We only do this for user-initiated
  // updates, to preserve historical behavior of legacy mode.
  // resetRenderTimer();
  // flushSyncWorkOnLegacyRootsOnly();
  // }
}

export function performConcurrentWorkOnRoot(root) {
  renderRootSync(root)
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  finishConcurrentRender(root)
}

function renderRootSync(root) {
  prepareFreshStack(root, NoLane);
  workLoopSync();
}

function prepareFreshStack(root, lanes: Lanes): Fiber {
  root.finishedWork = null;
  root.finishedLanes = NoLanes;

  const cancelPendingCommit = root.cancelPendingCommit;
  if (cancelPendingCommit !== null) {
    root.cancelPendingCommit = null;
    cancelPendingCommit?.();
  }

  // resetWorkInProgressStack();
  workInProgressRoot = root;
  const rootWorkInProgress = createWorkInProgress(root.current, null);
  workInProgress = rootWorkInProgress;
  workInProgressRootRenderLanes = lanes;
  workInProgressSuspendedReason = NotSuspended;
  workInProgressThrownValue = null;
  workInProgressRootDidAttachPingListener = false;
  workInProgressRootExitStatus = RootInProgress;
  workInProgressRootFatalError = null;
  workInProgressRootSkippedLanes = NoLanes;
  workInProgressRootInterleavedUpdatedLanes = NoLanes;
  workInProgressRootRenderPhaseUpdatedLanes = NoLanes;
  workInProgressRootPingedLanes = NoLanes;
  workInProgressDeferredLane = NoLane;
  workInProgressRootConcurrentErrors = null;
  workInProgressRootRecoverableErrors = null;

  // Get the lanes that are entangled with whatever we're about to render. We
  // track these separately so we can distinguish the priority of the render
  // task from the priority of the lanes it is entangled with. For example, a
  // transition may not be allowed to finish unless it includes the Sync lane,
  // which is currently suspended. We should be able to render the Transition
  // and Sync lane in the same batch, but at Transition priority, because the
  // Sync lane already suspended.
  // entangledRenderLanes = getEntangledLanes(root, lanes);

  finishQueueingConcurrentUpdates();

  return rootWorkInProgress;
}

function workLoopSync() {
  // Perform work without checking if we need to yield between fiber.
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork: Fiber): void {
  // The current, flushed, state of this fiber is the alternate. Ideally
  // nothing should rely on this, but relying on it here means that we don't
  // need an additional field on the work in progress.
  const current = unitOfWork.alternate;
  // setCurrentDebugFiberInDEV(unitOfWork);
  let next = beginWork(current, unitOfWork, entangledRenderLanes);

  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    // If this doesn't spawn new work, complete the current work.
    // workInProgress = next
    completeUnitOfWork(unitOfWork);
  } else {
    workInProgress = next;
  }

}

function completeUnitOfWork(unitOfWork: Fiber): void {
  // Attempt to complete the current unit of work, then move to the next
  // sibling. If there are no more siblings, return to the parent fiber.
  let completedWork: Fiber | null = unitOfWork;
  do {
    // The current, flushed, state of this fiber is the alternate. Ideally
    // nothing should rely on this, but relying on it here means that we don't
    // need an additional field on the work in progress.
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;

    // setCurrentDebugFiberInDEV(completedWork);
    let next;
    // if (!enableProfilerTimer || (completedWork.mode & ProfileMode) === NoMode) {
    next = completeWork(current, completedWork, entangledRenderLanes);
    // } else {
    //   startProfilerTimer(completedWork);
    //   next = completeWork(current, completedWork, entangledRenderLanes);
    //   // Update render duration assuming we didn't error.
    //   stopProfilerTimerIfRunningAndRecordDelta(completedWork, false);
    // }
    // resetCurrentDebugFiberInDEV();

    if (next !== null) {
      // Completing this fiber spawned new work. Work on that next.
      workInProgress = next;
      return;
    }

    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      // If there is more work to do in this returnFiber, do that next.
      workInProgress = siblingFiber;
      return;
    }
    // Otherwise, return to the parent
    // $FlowFixMe[incompatible-type] we bail out when we get a null
    completedWork = returnFiber;
    // Update the next thing we're working on in case something throws.
    workInProgress = completedWork;
  } while (completedWork !== null);

  // We've reached the root.
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }
}

function finishConcurrentRender(root) {
  commitRoot(root)
}

function commitRoot(
  root,
) {
  // TODO: This no longer makes any sense. We already wrap the mutation and
  // layout phases. Should be able to remove.
  commitRootImpl(
    root,
  );

  return null;
}


function commitRootImpl(
  root,
) {
  // do {
  //   flushPassiveEffects();
  // } while (rootWithPendingPassiveEffects !== null);
  // flushRenderPhaseStrictModeWarningsInDEV();

  const finishedWork = root.finishedWork;
  const lanes = root.finishedLanes;

  root.finishedWork = null;
  root.finishedLanes = NoLanes;

  // commitRoot never returns a continuation; it always finishes synchronously.
  // So we can clear these now to allow a new callback to be scheduled.
  root.callbackNode = null;
  root.callbackPriority = NoLane;
  root.cancelPendingCommit = null;

  // Check which lanes no longer have any work scheduled on them, and mark
  // those as finished.
  // let remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes);

  // // Make sure to account for lanes that were updated by a concurrent event
  // // during the render phase; don't mark them as finished.
  // const concurrentlyUpdatedLanes = getConcurrentlyUpdatedLanes();
  // remainingLanes = mergeLanes(remainingLanes, concurrentlyUpdatedLanes);

  // markRootFinished(root, remainingLanes, spawnedLane);

  if (root === workInProgressRoot) {
    // We can reset these now that they are finished.
    workInProgressRoot = null;
    workInProgress = null;
    workInProgressRootRenderLanes = NoLanes;
  } else {
    // This indicates that the last root we worked on is not the same one that
    // we're committing now. This most commonly happens when a suspended root
    // times out.
  }
  // If there are pending passive effects, schedule a callback to process them.
  // Do this as early as possible, so it is queued before anything else that
  // might get scheduled in the commit phase. (See #16714.)
  // TODO: Delete all other places that schedule the passive effect callback
  // They're redundant.
  if (
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
    (finishedWork.flags & PassiveMask) !== NoFlags
  ) {
    // if (!rootDoesHavePassiveEffects) {
    //   rootDoesHavePassiveEffects = true;
    //   pendingPassiveEffectsRemainingLanes = remainingLanes;
    //   // workInProgressTransitions might be overwritten, so we want
    //   // to store it in pendingPassiveTransitions until they get processed
    //   // We need to pass this through as an argument to commitRoot
    //   // because workInProgressTransitions might have changed between
    //   // the previous render and commit if we throttle the commit
    //   // with setTimeout
    //   pendingPassiveTransitions = transitions;
    //   scheduleCallback(NormalSchedulerPriority, () => {
    //     flushPassiveEffects();
    //     // This render triggered passive effects: release the root cache pool
    //     // *after* passive effects fire to avoid freeing a cache pool that may
    //     // be referenced by a node in the tree (HostRoot, Cache boundary etc)
    //     return null;
    //   });
    // }
  }

  // Check if there are any effects in the whole tree.
  // TODO: This is left over from the effect list implementation, where we had
  // to check for the existence of `firstEffect` to satisfy Flow. I think the
  // only other reason this optimization exists is because it affects profiling.
  // Reconsider whether this is necessary.
  const subtreeHasEffects =
    (finishedWork.subtreeFlags &
      (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==
    NoFlags;
  const rootHasEffect =
    (finishedWork.flags &
      (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==
    NoFlags;

  if (subtreeHasEffects || rootHasEffect) {
    // const prevTransition = ReactCurrentBatchConfig.transition;
    // ReactCurrentBatchConfig.transition = null;
    // const previousPriority = getCurrentUpdatePriority();
    // setCurrentUpdatePriority(DiscreteEventPriority);

    // const prevExecutionContext = executionContext;
    // executionContext |= CommitContext;

    // // Reset this to null before calling lifecycles
    // ReactCurrentOwner.current = null;

    // The commit phase is broken into several sub-phases. We do a separate pass
    // of the effect list for each phase: all mutation effects come before all
    // layout effects, and so on.

    // The first phase a "before mutation" phase. We use this phase to read the
    // state of the host tree right before we mutate it. This is where
    // getSnapshotBeforeUpdate is called.
    // TODO
    const shouldFireAfterActiveInstanceBlur = commitBeforeMutationEffects(
      root,
      finishedWork,
    );

    // The next phase is the mutation phase, where we mutate the host tree.
    // 页面绘制发生在这个阶段
    commitMutationEffects(root, finishedWork, lanes);
    const resetAfterCommit = (node) => { }
    resetAfterCommit(root.containerInfo);

    // The work-in-progress tree is now the current tree. This must come after
    // the mutation phase, so that the previous tree is still current during
    // componentWillUnmount, but before the layout phase, so that the finished
    // work is current during componentDidMount/Update.
    root.current = finishedWork;

    // The next phase is the layout phase, where we call effects that read
    // the host tree after it's been mutated. The idiomatic use case for this is
    // layout, but class component lifecycles also fire here for legacy reasons.
    commitLayoutEffects(finishedWork, root, lanes);


    // Tell Scheduler to yield at the end of the frame, so the browser has an
    // opportunity to paint.
    unstable_requestPaint();

    // executionContext = prevExecutionContext;

    // Reset the priority to the previous non-sync value.
    // setCurrentUpdatePriority(previousPriority);
    // ReactCurrentBatchConfig.transition = prevTransition;
  } else {
    // No effects.
    root.current = finishedWork;
    // Measure these anyway so the flamegraph explicitly shows that there were
    // no effects.
    // TODO: Maybe there's a better way to report this.
    // if (enableProfilerTimer) {
    //   recordCommitTime();
    // }
  }

  // const rootDidHavePassiveEffects = rootDoesHavePassiveEffects;

  // if (rootDoesHavePassiveEffects) {
  //   // This commit has passive effects. Stash a reference to them. But don't
  //   // schedule a callback until after flushing layout work.
  //   rootDoesHavePassiveEffects = false;
  //   rootWithPendingPassiveEffects = root;
  //   pendingPassiveEffectsLanes = lanes;
  // } else {
  //   // There were no passive effects, so we can immediately release the cache
  //   // pool for this render.
  //   releaseRootPooledCache(root, remainingLanes);
  // }

  // Read this again, since an effect might have updated it
  // remainingLanes = root.pendingLanes;

  // Check if there's remaining work on this root
  // TODO: This is part of the `componentDidCatch` implementation. Its purpose
  // is to detect whether something might have called setState inside
  // `componentDidCatch`. The mechanism is known to be flawed because `setState`
  // inside `componentDidCatch` is itself flawed — that's why we recommend
  // `getDerivedStateFromError` instead. However, it could be improved by
  // checking if remainingLanes includes Sync work, instead of whether there's
  // any work remaining at all (which would also include stuff like Suspense
  // retries or transitions). It's been like this for a while, though, so fixing
  // it probably isn't that urgent.
  // if (remainingLanes === NoLanes) {
  //   // If there's no remaining work, we can clear the set of already failed
  //   // error boundaries.
  //   legacyErrorBoundariesThatAlreadyFailed = null;
  // }


  // if (enableUpdaterTracking) {
  //   if (isDevToolsPresent) {
  //     root.memoizedUpdaters.clear();
  //   }
  // }

  // Always call this before exiting `commitRoot`, to ensure that any
  // additional work on this root is scheduled.
  // TODO 为什么这里要继续调度？
  // ensureRootIsScheduled(root);

  // if (recoverableErrors !== null) {
  //   // There were errors during this render, but recovered from them without
  //   // needing to surface it to the UI. We log them here.
  //   const onRecoverableError = root.onRecoverableError;
  //   for (let i = 0; i < recoverableErrors.length; i++) {
  //     const recoverableError = recoverableErrors[i];
  //     const errorInfo = makeErrorInfo(
  //       recoverableError.digest,
  //       recoverableError.stack,
  //     );
  //     onRecoverableError(recoverableError.value, errorInfo);
  //   }
  // }

  // if (hasUncaughtError) {
  //   hasUncaughtError = false;
  //   const error = firstUncaughtError;
  //   firstUncaughtError = null;
  //   throw error;
  // }

  // If the passive effects are the result of a discrete render, flush them
  // synchronously at the end of the current task so that the result is
  // immediately observable. Otherwise, we assume that they are not
  // order-dependent and do not need to be observed by external systems, so we
  // can wait until after paint.
  // TODO: We can optimize this by not scheduling the callback earlier. Since we
  // currently schedule the callback in multiple places, will wait until those
  // are consolidated.
  // if (includesSyncLane(pendingPassiveEffectsLanes) && root.tag !== LegacyRoot) {
  //   flushPassiveEffects();
  // }

  // Read this again, since a passive effect might have updated it
  // remainingLanes = root.pendingLanes;

  // Check if this render scheduled a cascading synchronous update. This is a
  // heurstic to detect infinite update loops. We are intentionally excluding
  // hydration lanes in this check, because render triggered by selective
  // hydration is conceptually not an update.
  // if (
  //   // Was the finished render the result of an update (not hydration)?
  //   includesSomeLane(lanes, UpdateLanes) &&
  //   // Did it schedule a sync update?
  //   includesSomeLane(remainingLanes, SyncUpdateLanes)
  // ) {
  //   if (enableProfilerTimer && enableProfilerNestedUpdatePhase) {
  //     markNestedUpdateScheduled();
  //   }

  //   // Count the number of times the root synchronously re-renders without
  //   // finishing. If there are too many, it indicates an infinite update loop.
  //   if (root === rootWithNestedUpdates) {
  //     nestedUpdateCount++;
  //   } else {
  //     nestedUpdateCount = 0;
  //     rootWithNestedUpdates = root;
  //   }
  // } else {
  //   nestedUpdateCount = 0;
  // }

  // If layout work was scheduled, flush it now.
  // flushSyncWorkOnAllRoots();

  // if (enableSchedulingProfiler) {
  //   markCommitStopped();
  // }

  // if (enableTransitionTracing) {
  //   // We process transitions during passive effects. However, passive effects can be
  //   // processed synchronously during the commit phase as well as asynchronously after
  //   // paint. At the end of the commit phase, we schedule a callback that will be called
  //   // after the next paint. If the transitions have already been processed (passive
  //   // effect phase happened synchronously), we will schedule a callback to process
  //   // the transitions. However, if we don't have any pending transition callbacks, this
  //   // means that the transitions have yet to be processed (passive effects processed after paint)
  //   // so we will store the end time of paint so that we can process the transitions
  //   // and then call the callback via the correct end time.
  //   const prevRootTransitionCallbacks = root.transitionCallbacks;
  //   if (prevRootTransitionCallbacks !== null) {
  //     schedulePostPaintCallback(endTime => {
  //       const prevPendingTransitionCallbacks =
  //         currentPendingTransitionCallbacks;
  //       if (prevPendingTransitionCallbacks !== null) {
  //         currentPendingTransitionCallbacks = null;
  //         scheduleCallback(IdleSchedulerPriority, () => {
  //           processTransitionCallbacks(
  //             prevPendingTransitionCallbacks,
  //             endTime,
  //             prevRootTransitionCallbacks,
  //           );
  //         });
  //       } else {
  //         currentEndTime = endTime;
  //       }
  //     });
  //   }
  // }

  return null;
}

export function requestUpdateLane(fiber: Fiber): Lane {
  // Special cases
  const mode = fiber.mode;
  if ((mode & ConcurrentMode) === NoMode) {
    return (SyncLane as Lane);
  } else if (
    (executionContext & RenderContext) !== NoContext &&
    workInProgressRootRenderLanes !== NoLanes
  ) {
    // This is a render phase update. These are not officially supported. The
    // old behavior is to give this the same "thread" (lanes) as
    // whatever is currently rendering. So if you call `setState` on a component
    // that happens later in the same render, it will flush. Ideally, we want to
    // remove the special case and treat them as if they came from an
    // interleaved event. Regardless, this pattern is not officially supported.
    // This behavior is only a fallback. The flag only exists until we can roll
    // out the setState warning, since existing code might accidentally rely on
    // the current behavior.
    // return pickArbitraryLane(workInProgressRootRenderLanes);
  }

  // const isTransition = requestCurrentTransition() !== NoTransition;
  // if (isTransition) {

  //   const actionScopeLane = peekEntangledActionLane();
  //   return actionScopeLane !== NoLane
  //     ? // We're inside an async action scope. Reuse the same lane.
  //       actionScopeLane
  //     : // We may or may not be inside an async action scope. If we are, this
  //       // is the first update in that scope. Either way, we need to get a
  //       // fresh transition lane.
  //       requestTransitionLane();
  // }

  // Updates originating inside certain React methods, like flushSync, have
  // their priority set by tracking it with a context variable.
  //
  // The opaque type returned by the host config is internally a lane, so we can
  // use that directly.
  // TODO: Move this type conversion to the event priority module.
  const updateLane: Lane = (getCurrentUpdatePriority() as any);
  if (updateLane !== NoLane) {
    return updateLane;
  }

  // This update originated outside React. Ask the host environment for an
  // appropriate priority, based on the type of event.
  //
  // The opaque type returned by the host config is internally a lane, so we can
  // use that directly.
  // TODO: Move this type conversion to the event priority module.
  const eventLane: Lane = (getCurrentEventPriority() as any);
  return eventLane;
}

export function getWorkInProgressRootRenderLanes(): Lanes {
  return workInProgressRootRenderLanes;
}