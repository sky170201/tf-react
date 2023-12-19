import { Lanes, NoLanes } from "./ReactFiberLane";
import { Fiber } from "./ReactInternalTypes";
import { ClassComponent, FunctionComponent, HostComponent, HostRoot, HostText, IndeterminateComponent } from "./ReactWorkTags";
import {
  processUpdateQueue,
} from './ReactFiberClassUpdateQueue'
import {
  mountChildFibers,
  reconcileChildFibers,
  // cloneChildFibers,
} from './ReactChildFiber';
import { PerformedWork } from "./ReactFiberFlags";
import { disableModulePatternComponents } from "shared/ReactFeatureFlags";
import {
  renderWithHooks,
} from './ReactFiberHooks';
import { resolveDefaultProps } from "./ReactFiberLazyComponent";

export function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  workInProgress.lanes = NoLanes;
  console.log('workInProgress.tag', workInProgress.tag, current)
  switch (workInProgress.tag) {
    case IndeterminateComponent: // 2
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type,
        renderLanes,
      );
    case FunctionComponent: {
      const Component = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps =
        workInProgress.elementType === Component
          ? unresolvedProps
          : resolveDefaultProps(Component, unresolvedProps);
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes,
      );
    }
    case HostRoot: // 3
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent: // 5
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText: // 6
      // 文本节点时直接返回null,没有fiber节点
      return updateHostText(current, workInProgress);
    default:
      return null
  }
}

function mountIndeterminateComponent(
  _current: null | Fiber,
  workInProgress: Fiber,
  Component: any,
  renderLanes: Lanes,
) {
  // resetSuspendedCurrentOnMountInLegacyMode(_current, workInProgress);

  const props = workInProgress.pendingProps;
  let context;
  // if (!disableLegacyContext) {
  //   const unmaskedContext = getUnmaskedContext(
  //     workInProgress,
  //     Component,
  //     false,
  //   );
  //   context = getMaskedContext(workInProgress, unmaskedContext);
  // }

  // prepareToReadContext(workInProgress, renderLanes);
  let value;
  let hasId;

  // if (enableSchedulingProfiler) {
  //   markComponentRenderStarted(workInProgress);
  // }
  value = renderWithHooks(
    null,
    workInProgress,
    Component,
    props,
    context,
    renderLanes,
  );
  // hasId = checkDidRenderIdHook();
  // if (enableSchedulingProfiler) {
  //   markComponentRenderStopped();
  // }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;

  if (
    // Run these checks in production only if the flag is off.
    // Eventually we'll delete this branch altogether.
    !disableModulePatternComponents &&
    typeof value === 'object' &&
    value !== null &&
    typeof value.render === 'function' &&
    value.$$typeof === undefined
  ) {

    // Proceed under the assumption that this is a class instance
    workInProgress.tag = ClassComponent;

    // Throw out any hooks that were used.
    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;

    // Push context providers early to prevent context stack mismatches.
    // During mounting we don't know the child context yet as the instance doesn't exist.
    // We will invalidate the child context in finishClassComponent() right after rendering.
    let hasContext = false;
    // if (isLegacyContextProvider(Component)) {
    //   hasContext = true;
    //   pushLegacyContextProvider(workInProgress);
    // } else {
    //   hasContext = false;
    // }

    workInProgress.memoizedState =
      value.state !== null && value.state !== undefined ? value.state : null;

    // initializeUpdateQueue(workInProgress);

    // adoptClassInstance(workInProgress, value);
    // mountClassInstance(workInProgress, Component, props, renderLanes);
    // return finishClassComponent(
    //   null,
    //   workInProgress,
    //   Component,
    //   true,
    //   hasContext,
    //   renderLanes,
    // );
    return null
  } else {
    // Proceed under the assumption that this is a function component
    workInProgress.tag = FunctionComponent;

    // if (getIsHydrating() && hasId) {
    //   pushMaterializedTreeId(workInProgress);
    // }

    reconcileChildren(null, workInProgress, value, renderLanes);
    return workInProgress.child;
  }
}

function updateHostRoot(
  current: null | Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {

  const nextProps = workInProgress.pendingProps;
  const prevState = workInProgress.memoizedState;
  const prevChildren = prevState?.element;

  processUpdateQueue(workInProgress, nextProps, null, renderLanes);
  const nextState = workInProgress.memoizedState;
  const nextChildren = nextState.element;

  // if (nextChildren === prevChildren) {
  //   return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  // }
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);

  return workInProgress.child;
}

function updateHostComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  // pushHostContext(workInProgress);

  // if (current === null) {
  //   tryToClaimNextHydratableInstance(workInProgress);
  // }

  const type = workInProgress.type;
  const nextProps = workInProgress.pendingProps;
  const prevProps = current !== null ? current.memoizedProps : null;

  let nextChildren = nextProps.children;
  // const isDirectTextChild = shouldSetTextContent(type, nextProps);

  // if (isDirectTextChild) {
  //   // We special case a direct text child of a host node. This is a common
  //   // case. We won't handle it as a reified child. We will instead handle
  //   // this in the host environment that also has access to this prop. That
  //   // avoids allocating another HostText fiber and traversing it.
  //   nextChildren = null;
  // } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
  //   // If we're switching from a direct text child to a normal child, or to
  //   // empty, we need to schedule the text content to be reset.
  //   workInProgress.flags |= ContentReset;
  // }

  // if (enableFormActions && enableAsyncActions) {
  //   const memoizedState = workInProgress.memoizedState;
  //   if (memoizedState !== null) {
  //     // This fiber has been upgraded to a stateful component. The only way
  //     // happens currently is for form actions. We use hooks to track the
  //     // pending and error state of the form.
  //     //
  //     // Once a fiber is upgraded to be stateful, it remains stateful for the
  //     // rest of its lifetime.
  //     const newState = renderTransitionAwareHostComponentWithHooks(
  //       current,
  //       workInProgress,
  //       renderLanes,
  //     );

  //     // If the transition state changed, propagate the change to all the
  //     // descendents. We use Context as an implementation detail for this.
  //     //
  //     // This is intentionally set here instead of pushHostContext because
  //     // pushHostContext gets called before we process the state hook, to avoid
  //     // a state mismatch in the event that something suspends.
  //     //
  //     // NOTE: This assumes that there cannot be nested transition providers,
  //     // because the only renderer that implements this feature is React DOM,
  //     // and forms cannot be nested. If we did support nested providers, then
  //     // we would need to push a context value even for host fibers that
  //     // haven't been upgraded yet.
  //     if (isPrimaryRenderer) {
  //       HostTransitionContext._currentValue = newState;
  //     } else {
  //       HostTransitionContext._currentValue2 = newState;
  //     }
  //     if (enableLazyContextPropagation) {
  //       // In the lazy propagation implementation, we don't scan for matching
  //       // consumers until something bails out.
  //     } else {
  //       if (didReceiveUpdate) {
  //         if (current !== null) {
  //           const oldStateHook: Hook = current.memoizedState;
  //           const oldState: TransitionStatus = oldStateHook.memoizedState;
  //           // This uses regular equality instead of Object.is because we assume
  //           // that host transition state doesn't include NaN as a valid type.
  //           if (oldState !== newState) {
  //             propagateContextChange(
  //               workInProgress,
  //               HostTransitionContext,
  //               renderLanes,
  //             );
  //           }
  //         }
  //       }
  //     }
  //   }
  // }

  // markRef(current, workInProgress);
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostText(current: null | Fiber, workInProgress: Fiber) {
  if (current === null) {
    // tryToClaimNextHydratableTextInstance(workInProgress);
  }
  // Nothing to do here. This is terminal. We'll do the completion step
  // immediately after.
  return null;
}

function updateFunctionComponent(
  current: null | Fiber,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
) {
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
    null, // context
    renderLanes,
  );

  // if (current !== null && !didReceiveUpdate) {
  //   bailoutHooks(current, workInProgress, renderLanes);
  //   return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  // }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

export function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any,
  renderLanes: Lanes,
) {
  debugger
  // 首次渲染
  if (current === null) {
    // If this is a fresh new component that hasn't been rendered yet, we
    // won't update its child set by applying minimal side-effects. Instead,
    // we will add them all to the child before it gets rendered. That means
    // we can optimize this reconciliation pass by not tracking side-effects.
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes,
    );
  } else {
    // If the current child is the same as the work in progress, it means that
    // we haven't yet started any work on these children. Therefore, we use
    // the clone algorithm to create a copy of all the current children.

    // If we had any progressed work already, that is invalid at this point so
    // let's throw it out.
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes,
    );
  }
}
