import { Lanes, NoLanes } from "./ReactFiberLane";
import { Fiber } from "./ReactInternalTypes";
import { ClassComponent, ForwardRef, FunctionComponent, HostComponent, HostRoot, HostText, IndeterminateComponent, MemoComponent, SimpleMemoComponent } from "./ReactWorkTags";
import {
  processUpdateQueue,
} from './ReactFiberClassUpdateQueue'
import {
  mountChildFibers,
  reconcileChildFibers,
  // cloneChildFibers,
} from './ReactChildFiber';
import { ForceUpdateForLegacySuspense, NoFlags, PerformedWork, Ref, RefStatic } from "./ReactFiberFlags";
import { disableModulePatternComponents, enableSchedulingProfiler } from "shared/ReactFeatureFlags";
import {
  renderWithHooks,
} from './ReactFiberHooks';
import { resolveDefaultProps } from "./ReactFiberLazyComponent";
import { createFiberFromTypeAndProps, createWorkInProgress, isSimpleFunctionComponent } from "./ReactFiber";
import getComponentNameFromType from "shared/getComponentNameFromType";
import shallowEqual from "shared/shallowEqual";

let didReceiveUpdate: boolean = false;
let didWarnAboutDefaultPropsOnFunctionComponent;

export function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  workInProgress.lanes = NoLanes;
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
    case ForwardRef: {
      const type = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps =
        workInProgress.elementType === type
          ? unresolvedProps
          : resolveDefaultProps(type, unresolvedProps);
      return updateForwardRef(
        current,
        workInProgress,
        type,
        resolvedProps,
        renderLanes,
      );
    }
    case MemoComponent: {
      const type = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      // Resolve outer props first, then resolve inner props.
      let resolvedProps = resolveDefaultProps(type, unresolvedProps);
      resolvedProps = resolveDefaultProps(type.type, resolvedProps);
      return updateMemoComponent(
        current,
        workInProgress,
        type,
        resolvedProps,
        renderLanes,
      );
    }
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

function updateForwardRef(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
) {
  // TODO: current can be non-null here even if the component
  // hasn't yet mounted. This happens after the first render suspends.
  // We'll need to figure out if this is fine or can cause issues.

  const render = Component.render;
  const ref = workInProgress.ref;

  // The rest is a fork of updateFunctionComponent
  let nextChildren;
  let hasId;
  // prepareToReadContext(workInProgress, renderLanes);
  if (enableSchedulingProfiler) {
    // markComponentRenderStarted(workInProgress);
  }
  nextChildren = renderWithHooks(
    current,
    workInProgress,
    render,
    nextProps,
    ref,
    renderLanes,
  );
  // hasId = checkDidRenderIdHook();
  if (enableSchedulingProfiler) {
    // markComponentRenderStopped();
  }

  if (current !== null && !didReceiveUpdate) {
    // bailoutHooks(current, workInProgress, renderLanes);
    // return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
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

/**
 * 标记ref副作用
 * 1、普通元素div
 * 2、组件
 * 在commit阶段发现如果有ref副作用时，会给ref赋值
 */
function markRef(current: Fiber | null, workInProgress: Fiber) {
  const ref = workInProgress.ref;
  if (
    (current === null && ref !== null) ||
    (current !== null && current.ref !== ref)
  ) {
    // Schedule a Ref effect
    workInProgress.flags |= Ref;
    workInProgress.flags |= RefStatic;
  }
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

  markRef(current, workInProgress);
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

function updateMemoComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
): null | Fiber {
  if (current === null) {
    const type = Component.type;
    if (
      isSimpleFunctionComponent(type) &&
      Component.compare === null &&
      // SimpleMemoComponent codepath doesn't resolve outer props either.
      Component.defaultProps === undefined
    ) {
      let resolvedType = type;
      // If this is a plain function component without default props,
      // and with only the default shallow comparison, we upgrade it
      // to a SimpleMemoComponent to allow fast path updates.
      workInProgress.tag = SimpleMemoComponent;
      workInProgress.type = resolvedType;
      return updateSimpleMemoComponent(
        current,
        workInProgress,
        resolvedType,
        nextProps,
        renderLanes,
      );
    }
    if (Component.defaultProps !== undefined) {
      const componentName = getComponentNameFromType(type) || 'Unknown';
      if (!didWarnAboutDefaultPropsOnFunctionComponent[componentName]) {
        console.error(
          '%s: Support for defaultProps will be removed from memo components ' +
            'in a future major release. Use JavaScript default parameters instead.',
          componentName,
        );
        didWarnAboutDefaultPropsOnFunctionComponent[componentName] = true;
      }
    }
    const child = createFiberFromTypeAndProps(
      Component.type,
      null,
      nextProps,
      null,
      workInProgress,
      workInProgress.mode,
      renderLanes,
    );
    child.ref = workInProgress.ref;
    child.return = workInProgress;
    workInProgress.child = child;
    return child;
  }
  const currentChild: any = current.child; // This is always exactly one child
  const hasScheduledUpdateOrContext = checkScheduledUpdateOrContext(
    current,
    renderLanes,
  );
  if (!hasScheduledUpdateOrContext) {
    // This will be the props with resolved defaultProps,
    // unlike current.memoizedProps which will be the unresolved ones.
    const prevProps = currentChild?.memoizedProps;
    // Default to shallow comparison
    let compare = Component.compare;
    compare = compare !== null ? compare : shallowEqual;
    if (compare(prevProps, nextProps) && current.ref === workInProgress.ref) {
      // return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }
  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  const newChild = createWorkInProgress(currentChild, nextProps);
  newChild.ref = workInProgress.ref;
  newChild.return = workInProgress;
  workInProgress.child = newChild;
  return newChild;
}

function updateSimpleMemoComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
): null | Fiber {
  // TODO: current can be non-null here even if the component
  // hasn't yet mounted. This happens when the inner render suspends.
  // We'll need to figure out if this is fine or can cause issues.

  if (current !== null) {
    const prevProps = current.memoizedProps;
    if (
      shallowEqual(prevProps, nextProps) &&
      current.ref === workInProgress.ref
    ) {
      didReceiveUpdate = false;

      // The props are shallowly equal. Reuse the previous props object, like we
      // would during a normal fiber bailout.
      //
      // We don't have strong guarantees that the props object is referentially
      // equal during updates where we can't bail out anyway — like if the props
      // are shallowly equal, but there's a local state or context update in the
      // same batch.
      //
      // However, as a principle, we should aim to make the behavior consistent
      // across different ways of memoizing a component. For example, React.memo
      // has a different internal Fiber layout if you pass a normal function
      // component (SimpleMemoComponent) versus if you pass a different type
      // like forwardRef (MemoComponent). But this is an implementation detail.
      // Wrapping a component in forwardRef (or React.lazy, etc) shouldn't
      // affect whether the props object is reused during a bailout.
      workInProgress.pendingProps = nextProps = prevProps;

      if (!checkScheduledUpdateOrContext(current, renderLanes)) {
        // The pending lanes were cleared at the beginning of beginWork. We're
        // about to bail out, but there might be other lanes that weren't
        // included in the current render. Usually, the priority level of the
        // remaining updates is accumulated during the evaluation of the
        // component (i.e. when processing the update queue). But since since
        // we're bailing out early *without* evaluating the component, we need
        // to account for it here, too. Reset to the value of the current fiber.
        // NOTE: This only applies to SimpleMemoComponent, not MemoComponent,
        // because a MemoComponent fiber does not have hooks or an update queue;
        // rather, it wraps around an inner component, which may or may not
        // contains hooks.
        // TODO: Move the reset at in beginWork out of the common path so that
        // this is no longer necessary.
        workInProgress.lanes = current.lanes;
        // return bailoutOnAlreadyFinishedWork(
        //   current,
        //   workInProgress,
        //   renderLanes,
        // );
      } else if ((current.flags & ForceUpdateForLegacySuspense) !== NoFlags) {
        // This is a special case that only exists for legacy mode.
        // See https://github.com/facebook/react/pull/19216.
        didReceiveUpdate = true;
      }
    }
  }
  return updateFunctionComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes,
  );
}

function checkScheduledUpdateOrContext(
  current: Fiber,
  renderLanes: Lanes,
): boolean {
  // Before performing an early bailout, we must check if there are pending
  // updates or context.
  const updateLanes = current.lanes;
  // if (includesSomeLane(updateLanes, renderLanes)) {
  //   return true;
  // }
  // No pending update, but because context is propagated lazily, we need
  // to check for a context change before we bail out.
  // if (enableLazyContextPropagation) {
  //   const dependencies = current.dependencies;
  //   if (dependencies !== null && checkIfContextChanged(dependencies)) {
  //     return true;
  //   }
  // }
  return false;
}

export function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any,
  renderLanes: Lanes,
) {
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
