import { NoFlags, StaticMask, Update } from "./ReactFiberFlags";
import { Lanes, NoLanes } from "./ReactFiberLane";
import { Fiber } from "./ReactInternalTypes";
import {
  IndeterminateComponent,
  FunctionComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostText,
  HostPortal,
  ContextProvider,
  ContextConsumer,
  ForwardRef,
  Fragment,
  Mode,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  MemoComponent,
  SimpleMemoComponent,
  LazyComponent,
  IncompleteClassComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
  TracingMarkerComponent,
} from './ReactWorkTags';
import { prepareUpdate, createTextInstance, createInstance, appendInitialChild, finalizeInitialChildren, supportsMutation } from 'react-dom-bindings/src/client/ReactFiberConfigDOM'

function markUpdate(workInProgress: Fiber) {
  workInProgress.flags |= Update;
}

function bubbleProperties(completedWork: Fiber) {
  const didBailout =
    completedWork.alternate !== null &&
    completedWork.alternate.child === completedWork.child;

  let newChildLanes = NoLanes;
  let subtreeFlags = NoFlags;

  if (!didBailout) {
    // Bubble up the earliest expiration time.
    // if (enableProfilerTimer && (completedWork.mode & ProfileMode) !== NoMode) {
    if (false) {
      // In profiling mode, resetChildExpirationTime is also used to reset
      // profiler durations.
      let actualDuration = completedWork.actualDuration;
      let treeBaseDuration = completedWork.selfBaseDuration;

      let child = completedWork.child;
      while (child !== null) {
        // newChildLanes = mergeLanes(
        //   newChildLanes,
        //   mergeLanes(child.lanes, child.childLanes),
        // );

        // subtreeFlags |= child.subtreeFlags;
        // subtreeFlags |= child.flags;

        // When a fiber is cloned, its actualDuration is reset to 0. This value will
        // only be updated if work is done on the fiber (i.e. it doesn't bailout).
        // When work is done, it should bubble to the parent's actualDuration. If
        // the fiber has not been cloned though, (meaning no work was done), then
        // this value will reflect the amount of time spent working on a previous
        // render. In that case it should not bubble. We determine whether it was
        // cloned by comparing the child pointer.
        // $FlowFixMe[unsafe-addition] addition with possible null/undefined value
        actualDuration += child.actualDuration;

        // $FlowFixMe[unsafe-addition] addition with possible null/undefined value
        treeBaseDuration += child.treeBaseDuration;
        child = child.sibling;
      }

      completedWork.actualDuration = actualDuration;
      completedWork.treeBaseDuration = treeBaseDuration;
    } else {
      let child = completedWork.child;
      while (child !== null) {
        // newChildLanes = mergeLanes(
        //   newChildLanes,
        //   mergeLanes(child.lanes, child.childLanes),
        // );

        subtreeFlags |= child.subtreeFlags;
        subtreeFlags |= child.flags;

        // Update the return pointer so the tree is consistent. This is a code
        // smell because it assumes the commit phase is never concurrent with
        // the render phase. Will address during refactor to alternate model.
        child.return = completedWork;

        child = child.sibling;
      }
    }

    completedWork.subtreeFlags |= subtreeFlags;
  } else {
    // Bubble up the earliest expiration time.
    // if (enableProfilerTimer && (completedWork.mode & ProfileMode) !== NoMode) {
    //   // In profiling mode, resetChildExpirationTime is also used to reset
    //   // profiler durations.
    //   let treeBaseDuration = ((completedWork.selfBaseDuration: any): number);

    //   let child = completedWork.child;
    //   while (child !== null) {
    //     newChildLanes = mergeLanes(
    //       newChildLanes,
    //       mergeLanes(child.lanes, child.childLanes),
    //     );

    //     // "Static" flags share the lifetime of the fiber/hook they belong to,
    //     // so we should bubble those up even during a bailout. All the other
    //     // flags have a lifetime only of a single render + commit, so we should
    //     // ignore them.
    //     subtreeFlags |= child.subtreeFlags & StaticMask;
    //     subtreeFlags |= child.flags & StaticMask;

    //     // $FlowFixMe[unsafe-addition] addition with possible null/undefined value
    //     treeBaseDuration += child.treeBaseDuration;
    //     child = child.sibling;
    //   }

    //   completedWork.treeBaseDuration = treeBaseDuration;
    // } else {
    //   let child = completedWork.child;
    //   while (child !== null) {
    //     newChildLanes = mergeLanes(
    //       newChildLanes,
    //       mergeLanes(child.lanes, child.childLanes),
    //     );

    //     // "Static" flags share the lifetime of the fiber/hook they belong to,
    //     // so we should bubble those up even during a bailout. All the other
    //     // flags have a lifetime only of a single render + commit, so we should
    //     // ignore them.
    //     subtreeFlags |= child.subtreeFlags & StaticMask;
    //     subtreeFlags |= child.flags & StaticMask;

    //     // Update the return pointer so the tree is consistent. This is a code
    //     // smell because it assumes the commit phase is never concurrent with
    //     // the render phase. Will address during refactor to alternate model.
    //     child.return = completedWork;

    //     child = child.sibling;
    //   }
    // }

    completedWork.subtreeFlags |= subtreeFlags;
  }

  completedWork.childLanes = newChildLanes;

  return didBailout;
}

function updateHostComponent(
  current,
  workInProgress,
  type,
  newProps,
  renderLanes,) {
  
  if (supportsMutation) {
    // If we have an alternate, that means this is an update and we need to
    // schedule a side-effect to do the updates.
    const oldProps = current.memoizedProps;
    if (oldProps === newProps) {
      // In mutation mode, this is sufficient for a bailout because
      // we won't touch this node even if children changed.
      return;
    }
    markUpdate(workInProgress);
  }
}


// An unfortunate fork of appendAllChildren because we have two different parent types.
function appendAllChildrenToContainer(
  containerChildSet,
  workInProgress: Fiber,
  needsVisibilityToggle: boolean,
  isHidden: boolean,
) {
  // if (supportsPersistence) {
  if (true) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    let node = workInProgress.child;
    while (node !== null) {
      // eslint-disable-next-line no-labels
      if (node.tag === HostComponent) {
        let instance = node.stateNode;
        // if (needsVisibilityToggle && isHidden) {
        //   // This child is inside a timed out tree. Hide it.
        //   const props = node.memoizedProps;
        //   const type = node.type;
        //   instance = cloneHiddenInstance(instance, type, props);
        // }
        // appendChildToContainerChildSet(containerChildSet, instance);
      } else if (node.tag === HostText) {
        let instance = node.stateNode;
        // if (needsVisibilityToggle && isHidden) {
        //   // This child is inside a timed out tree. Hide it.
        //   const text = node.memoizedProps;
        //   instance = cloneHiddenTextInstance(instance, text);
        // }
        // appendChildToContainerChildSet(containerChildSet, instance);
      } else if (node.tag === HostPortal) {
        // If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
      } else if (
        node.tag === OffscreenComponent &&
        node.memoizedState !== null
      ) {
        // The children in this boundary are hidden. Toggle their visibility
        // before appending.
        const child = node.child;
        if (child !== null) {
          child.return = node;
        }
        // If Offscreen is not in manual mode, detached tree is hidden from user space.
        // const _needsVisibilityToggle = !isOffscreenManual(node);
        const _needsVisibilityToggle = false;
        appendAllChildrenToContainer(
          containerChildSet,
          node,
          /* needsVisibilityToggle */ _needsVisibilityToggle,
          /* isHidden */ true,
        );
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      node = node;
      if (node === workInProgress) {
        return;
      }
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      while (node.sibling === null) {
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        if (node.return === null || node.return === workInProgress) {
          return;
        }
        node = node.return;
      }
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      node.sibling.return = node.return;
      node = node.sibling;
    }
  }
}

function updateHostContainer(current: null | Fiber, workInProgress: Fiber) {
  // if (supportsPersistence) {
  //   if (doesRequireClone(current, workInProgress)) {
  const portalOrRoot: {
    containerInfo,
    pendingChildren,
  } = workInProgress.stateNode;
  const container = portalOrRoot.containerInfo;
  // const newChildSet = createContainerChildSet();
  const newChildSet = new Set();
  // If children might have changed, we have to add them all to the set.
  appendAllChildrenToContainer(
    newChildSet,
    workInProgress,
        /* needsVisibilityToggle */ false,
        /* isHidden */ false,
  );
  portalOrRoot.pendingChildren = newChildSet;
  // Schedule an update on the container to swap out the container.
  markUpdate(workInProgress);
  // finalizeContainerChildren(container, newChildSet);
  //   }
  // }
}


function appendAllChildren(
  parent,
  workInProgress: Fiber,
) {
  let node = workInProgress.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      let instance = node.stateNode;
      appendInitialChild(parent, instance);
    } else if (node.tag === HostPortal) {
      // If we have a portal child, then we don't want to traverse
      // down its children. Instead, we'll get insertions from each child in
      // the portal directly.
    } else if (
      node.tag === OffscreenComponent &&
      node.memoizedState !== null
    ) {
      // The children in this boundary are hidden. Toggle their visibility
      // before appending.
      const child = node.child;
      if (child !== null) {
        child.return = node;
      }
      appendAllChildren(
        parent,
        node,
      );
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === workInProgress) {
      return;
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

function completeWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  const newProps = workInProgress.pendingProps;
  // Note: This intentionally doesn't check if we're hydrating because comparing
  // to the current tree provider fiber is just as fast and less error-prone.
  // Ideally we would have a special version of the work loop only
  // for hydration.
  // popTreeContext(workInProgress);
  console.log('workInProgress.tag', workInProgress.tag, workInProgress)
  switch (workInProgress.tag) {
    case IndeterminateComponent:
    case LazyComponent:
    case SimpleMemoComponent:
    case FunctionComponent:
    case ForwardRef:
    case Fragment:
    case Mode:
    case Profiler:
    case ContextConsumer:
    case MemoComponent:
      bubbleProperties(workInProgress);
      return null;
    case ClassComponent: {
      const Component = workInProgress.type;
      // if (isLegacyContextProvider(Component)) {
      //   popLegacyContext(workInProgress);
      // }
      bubbleProperties(workInProgress);
      return null;
    }
    case HostRoot: {
      const fiberRoot = workInProgress.stateNode;

      // if (enableTransitionTracing) {
      //   const transitions = getWorkInProgressTransitions();
      //   // We set the Passive flag here because if there are new transitions,
      //   // we will need to schedule callbacks and process the transitions,
      //   // which we do in the passive phase
      //   if (transitions !== null) {
      //     workInProgress.flags |= Passive;
      //   }
      // }

      // if (enableCache) {
      //   let previousCache: Cache | null = null;
      //   if (current !== null) {
      //     previousCache = current.memoizedState.cache;
      //   }
      //   const cache: Cache = workInProgress.memoizedState.cache;
      //   if (cache !== previousCache) {
      //     // Run passive effects to retain/release the cache.
      //     workInProgress.flags |= Passive;
      //   }
      //   popCacheProvider(workInProgress, cache);
      // }

      // if (enableTransitionTracing) {
      //   popRootMarkerInstance(workInProgress);
      // }

      // popRootTransition(workInProgress, fiberRoot, renderLanes);
      // popHostContainer(workInProgress);
      // popTopLevelLegacyContextObject(workInProgress);
      // if (fiberRoot.pendingContext) {
      //   fiberRoot.context = fiberRoot.pendingContext;
      //   fiberRoot.pendingContext = null;
      // }
      // if (current === null || current.child === null) {
      //   // If we hydrated, pop so that we can delete any remaining children
      //   // that weren't hydrated.
      //   const wasHydrated = popHydrationState(workInProgress);
      //   if (wasHydrated) {
      //     // If we hydrated, then we'll need to schedule an update for
      //     // the commit side-effects on the root.
      //     markUpdate(workInProgress);
      //   } else {
      //     if (current !== null) {
      //       const prevState: RootState = current.memoizedState;
      //       if (
      //         // Check if this is a client root
      //         !prevState.isDehydrated ||
      //         // Check if we reverted to client rendering (e.g. due to an error)
      //         (workInProgress.flags & ForceClientRender) !== NoFlags
      //       ) {
      //         // Schedule an effect to clear this container at the start of the
      //         // next commit. This handles the case of React rendering into a
      //         // container with previous children. It's also safe to do for
      //         // updates too, because current.child would only be null if the
      //         // previous render was null (so the container would already
      //         // be empty).
      //         workInProgress.flags |= Snapshot;

      //         // If this was a forced client render, there may have been
      //         // recoverable errors during first hydration attempt. If so, add
      //         // them to a queue so we can log them in the commit phase.
      //         upgradeHydrationErrorsToRecoverable();
      //       }
      //     }
      //   }
      // }
      updateHostContainer(current, workInProgress);
      bubbleProperties(workInProgress);
      // if (enableTransitionTracing) {
      //   if ((workInProgress.subtreeFlags & Visibility) !== NoFlags) {
      //     // If any of our suspense children toggle visibility, this means that
      //     // the pending boundaries array needs to be updated, which we only
      //     // do in the passive phase.
      //     workInProgress.flags |= Passive;
      //   }
      // }
      return null;
    }
    // case HostHoistable: {
    //   if (enableFloat && supportsResources) {
    //     // The branching here is more complicated than you might expect because
    //     // a HostHoistable sometimes corresponds to a Resource and sometimes
    //     // corresponds to an Instance. It can also switch during an update.

    //     const type = workInProgress.type;
    //     const nextResource: Resource | null = workInProgress.memoizedState;
    //     if (current === null) {
    //       // We are mounting and must Update this Hoistable in this commit
    //       // @TODO refactor this block to create the instance here in complete
    //       // phase if we are not hydrating.
    //       markUpdate(workInProgress);
    //       if (workInProgress.ref !== null) {
    //         markRef(workInProgress);
    //       }
    //       if (nextResource !== null) {
    //         // This is a Hoistable Resource

    //         // This must come at the very end of the complete phase.
    //         bubbleProperties(workInProgress);
    //         preloadResourceAndSuspendIfNeeded(
    //           workInProgress,
    //           nextResource,
    //           type,
    //           newProps,
    //           renderLanes,
    //         );
    //         return null;
    //       } else {
    //         // This is a Hoistable Instance

    //         // This must come at the very end of the complete phase.
    //         bubbleProperties(workInProgress);
    //         preloadInstanceAndSuspendIfNeeded(
    //           workInProgress,
    //           type,
    //           newProps,
    //           renderLanes,
    //         );
    //         return null;
    //       }
    //     } else {
    //       // We are updating.
    //       const currentResource = current.memoizedState;
    //       if (nextResource !== currentResource) {
    //         // We are transitioning to, from, or between Hoistable Resources
    //         // and require an update
    //         markUpdate(workInProgress);
    //       }
    //       if (current.ref !== workInProgress.ref) {
    //         markRef(workInProgress);
    //       }
    //       if (nextResource !== null) {
    //         // This is a Hoistable Resource
    //         // This must come at the very end of the complete phase.

    //         bubbleProperties(workInProgress);
    //         if (nextResource === currentResource) {
    //           workInProgress.flags &= ~MaySuspendCommit;
    //         } else {
    //           preloadResourceAndSuspendIfNeeded(
    //             workInProgress,
    //             nextResource,
    //             type,
    //             newProps,
    //             renderLanes,
    //           );
    //         }
    //         return null;
    //       } else {
    //         // This is a Hoistable Instance
    //         // We may have props to update on the Hoistable instance.
    //         if (supportsMutation) {
    //           const oldProps = current.memoizedProps;
    //           if (oldProps !== newProps) {
    //             markUpdate(workInProgress);
    //           }
    //         } else {
    //           // We use the updateHostComponent path becuase it produces
    //           // the update queue we need for Hoistables.
    //           updateHostComponent(
    //             current,
    //             workInProgress,
    //             type,
    //             newProps,
    //             renderLanes,
    //           );
    //         }

    //         // This must come at the very end of the complete phase.
    //         bubbleProperties(workInProgress);
    //         preloadInstanceAndSuspendIfNeeded(
    //           workInProgress,
    //           type,
    //           newProps,
    //           renderLanes,
    //         );
    //         return null;
    //       }
    //     }
    //   }
    //   // Fall through
    // }
    // case HostSingleton: {
    //   if (supportsSingletons) {
    //     popHostContext(workInProgress);
    //     const rootContainerInstance = getRootHostContainer();
    //     const type = workInProgress.type;
    //     if (current !== null && workInProgress.stateNode != null) {
    //       if (supportsMutation) {
    //         const oldProps = current.memoizedProps;
    //         if (oldProps !== newProps) {
    //           markUpdate(workInProgress);
    //         }
    //       } else {
    //         updateHostComponent(
    //           current,
    //           workInProgress,
    //           type,
    //           newProps,
    //           renderLanes,
    //         );
    //       }

    //       if (current.ref !== workInProgress.ref) {
    //         markRef(workInProgress);
    //       }
    //     } else {
    //       if (!newProps) {
    //         if (workInProgress.stateNode === null) {
    //           throw new Error(
    //             'We must have new props for new mounts. This error is likely ' +
    //               'caused by a bug in React. Please file an issue.',
    //           );
    //         }

    //         // This can happen when we abort work.
    //         bubbleProperties(workInProgress);
    //         return null;
    //       }

    //       const currentHostContext = getHostContext();
    //       const wasHydrated = popHydrationState(workInProgress);
    //       let instance: Instance;
    //       if (wasHydrated) {
    //         // We ignore the boolean indicating there is an updateQueue because
    //         // it is used only to set text children and HostSingletons do not
    //         // use them.
    //         prepareToHydrateHostInstance(workInProgress, currentHostContext);
    //         instance = workInProgress.stateNode;
    //       } else {
    //         instance = resolveSingletonInstance(
    //           type,
    //           newProps,
    //           rootContainerInstance,
    //           currentHostContext,
    //           true,
    //         );
    //         workInProgress.stateNode = instance;
    //         markUpdate(workInProgress);
    //       }

    //       if (workInProgress.ref !== null) {
    //         // If there is a ref on a host node we need to schedule a callback
    //         markRef(workInProgress);
    //       }
    //     }
    //     bubbleProperties(workInProgress);
    //     return null;
    //   }
    //   // Fall through
    // }
    case HostComponent: {
      // popHostContext(workInProgress);
      const type = workInProgress.type;
      if (current !== null && workInProgress.stateNode != null) {
        updateHostComponent(
          current,
          workInProgress,
          type,
          newProps,
          renderLanes,
        );
      } else {
        // 初始化走创建逻辑
        // 创建时给每个节点添加实例
        const instance = createInstance(type, newProps, workInProgress)
        appendAllChildren(instance, workInProgress);
        workInProgress.stateNode = instance;
        // 属性初始化
        finalizeInitialChildren(
          instance,
          type,
          newProps,
        )
      }
      bubbleProperties(workInProgress);

      // This must come at the very end of the complete phase, because it might
      // throw to suspend, and if the resource immediately loads, the work loop
      // will resume rendering as if the work-in-progress completed. So it must
      // fully complete.
      // preloadInstanceAndSuspendIfNeeded(
      //   workInProgress,
      //   workInProgress.type,
      //   workInProgress.pendingProps,
      //   renderLanes,
      // );
      return null;
    }
    case HostText: {
      const newText = newProps;
      workInProgress.stateNode = createTextInstance(newText);
      bubbleProperties(workInProgress);
      return null;
    }
    // case SuspenseComponent: {
    //   popSuspenseHandler(workInProgress);
    //   const nextState: null | SuspenseState = workInProgress.memoizedState;

    //   // Special path for dehydrated boundaries. We may eventually move this
    //   // to its own fiber type so that we can add other kinds of hydration
    //   // boundaries that aren't associated with a Suspense tree. In anticipation
    //   // of such a refactor, all the hydration logic is contained in
    //   // this branch.
    //   if (
    //     current === null ||
    //     (current.memoizedState !== null &&
    //       current.memoizedState.dehydrated !== null)
    //   ) {
    //     const fallthroughToNormalSuspensePath =
    //       completeDehydratedSuspenseBoundary(
    //         current,
    //         workInProgress,
    //         nextState,
    //       );
    //     if (!fallthroughToNormalSuspensePath) {
    //       if (workInProgress.flags & ForceClientRender) {
    //         // Special case. There were remaining unhydrated nodes. We treat
    //         // this as a mismatch. Revert to client rendering.
    //         return workInProgress;
    //       } else {
    //         // Did not finish hydrating, either because this is the initial
    //         // render or because something suspended.
    //         return null;
    //       }
    //     }

    //     // Continue with the normal Suspense path.
    //   }

    //   if ((workInProgress.flags & DidCapture) !== NoFlags) {
    //     // Something suspended. Re-render with the fallback children.
    //     workInProgress.lanes = renderLanes;
    //     // Do not reset the effect list.
    //     if (
    //       enableProfilerTimer &&
    //       (workInProgress.mode & ProfileMode) !== NoMode
    //     ) {
    //       transferActualDuration(workInProgress);
    //     }
    //     // Don't bubble properties in this case.
    //     return workInProgress;
    //   }

    //   const nextDidTimeout = nextState !== null;
    //   const prevDidTimeout =
    //     current !== null &&
    //     (current.memoizedState: null | SuspenseState) !== null;

    //   if (enableCache && nextDidTimeout) {
    //     const offscreenFiber: Fiber = (workInProgress.child: any);
    //     let previousCache: Cache | null = null;
    //     if (
    //       offscreenFiber.alternate !== null &&
    //       offscreenFiber.alternate.memoizedState !== null &&
    //       offscreenFiber.alternate.memoizedState.cachePool !== null
    //     ) {
    //       previousCache = offscreenFiber.alternate.memoizedState.cachePool.pool;
    //     }
    //     let cache: Cache | null = null;
    //     if (
    //       offscreenFiber.memoizedState !== null &&
    //       offscreenFiber.memoizedState.cachePool !== null
    //     ) {
    //       cache = offscreenFiber.memoizedState.cachePool.pool;
    //     }
    //     if (cache !== previousCache) {
    //       // Run passive effects to retain/release the cache.
    //       offscreenFiber.flags |= Passive;
    //     }
    //   }

    //   // If the suspended state of the boundary changes, we need to schedule
    //   // a passive effect, which is when we process the transitions
    //   if (nextDidTimeout !== prevDidTimeout) {
    //     if (enableTransitionTracing) {
    //       const offscreenFiber: Fiber = (workInProgress.child: any);
    //       offscreenFiber.flags |= Passive;
    //     }

    //     // If the suspended state of the boundary changes, we need to schedule
    //     // an effect to toggle the subtree's visibility. When we switch from
    //     // fallback -> primary, the inner Offscreen fiber schedules this effect
    //     // as part of its normal complete phase. But when we switch from
    //     // primary -> fallback, the inner Offscreen fiber does not have a complete
    //     // phase. So we need to schedule its effect here.
    //     //
    //     // We also use this flag to connect/disconnect the effects, but the same
    //     // logic applies: when re-connecting, the Offscreen fiber's complete
    //     // phase will handle scheduling the effect. It's only when the fallback
    //     // is active that we have to do anything special.
    //     if (nextDidTimeout) {
    //       const offscreenFiber: Fiber = (workInProgress.child: any);
    //       offscreenFiber.flags |= Visibility;
    //     }
    //   }

    //   const retryQueue: RetryQueue | null = (workInProgress.updateQueue: any);
    //   scheduleRetryEffect(workInProgress, retryQueue);

    //   if (
    //     enableSuspenseCallback &&
    //     workInProgress.updateQueue !== null &&
    //     workInProgress.memoizedProps.suspenseCallback != null
    //   ) {
    //     // Always notify the callback
    //     // TODO: Move to passive phase
    //     workInProgress.flags |= Update;
    //   }
    //   bubbleProperties(workInProgress);
    //   if (enableProfilerTimer) {
    //     if ((workInProgress.mode & ProfileMode) !== NoMode) {
    //       if (nextDidTimeout) {
    //         // Don't count time spent in a timed out Suspense subtree as part of the base duration.
    //         const primaryChildFragment = workInProgress.child;
    //         if (primaryChildFragment !== null) {
    //           // $FlowFixMe[unsafe-arithmetic] Flow doesn't support type casting in combination with the -= operator
    //           workInProgress.treeBaseDuration -=
    //             ((primaryChildFragment.treeBaseDuration: any): number);
    //         }
    //       }
    //     }
    //   }
    //   return null;
    // }
    // case HostPortal:
    //   popHostContainer(workInProgress);
    //   updateHostContainer(current, workInProgress);
    //   if (current === null) {
    //     preparePortalMount(workInProgress.stateNode.containerInfo);
    //   }
    //   bubbleProperties(workInProgress);
    //   return null;
    // case ContextProvider:
    //   // Pop provider fiber
    //   const context: ReactContext<any> = workInProgress.type._context;
    //   popProvider(context, workInProgress);
    //   bubbleProperties(workInProgress);
    //   return null;
    // case IncompleteClassComponent: {
    //   // Same as class component case. I put it down here so that the tags are
    //   // sequential to ensure this switch is compiled to a jump table.
    //   const Component = workInProgress.type;
    //   if (isLegacyContextProvider(Component)) {
    //     popLegacyContext(workInProgress);
    //   }
    //   bubbleProperties(workInProgress);
    //   return null;
    // }
    // case SuspenseListComponent: {
    //   popSuspenseListContext(workInProgress);

    //   const renderState: null | SuspenseListRenderState =
    //     workInProgress.memoizedState;

    //   if (renderState === null) {
    //     // We're running in the default, "independent" mode.
    //     // We don't do anything in this mode.
    //     bubbleProperties(workInProgress);
    //     return null;
    //   }

    //   let didSuspendAlready = (workInProgress.flags & DidCapture) !== NoFlags;

    //   const renderedTail = renderState.rendering;
    //   if (renderedTail === null) {
    //     // We just rendered the head.
    //     if (!didSuspendAlready) {
    //       // This is the first pass. We need to figure out if anything is still
    //       // suspended in the rendered set.

    //       // If new content unsuspended, but there's still some content that
    //       // didn't. Then we need to do a second pass that forces everything
    //       // to keep showing their fallbacks.

    //       // We might be suspended if something in this render pass suspended, or
    //       // something in the previous committed pass suspended. Otherwise,
    //       // there's no chance so we can skip the expensive call to
    //       // findFirstSuspended.
    //       const cannotBeSuspended =
    //         renderHasNotSuspendedYet() &&
    //         (current === null || (current.flags & DidCapture) === NoFlags);
    //       if (!cannotBeSuspended) {
    //         let row = workInProgress.child;
    //         while (row !== null) {
    //           const suspended = findFirstSuspended(row);
    //           if (suspended !== null) {
    //             didSuspendAlready = true;
    //             workInProgress.flags |= DidCapture;
    //             cutOffTailIfNeeded(renderState, false);

    //             // If this is a newly suspended tree, it might not get committed as
    //             // part of the second pass. In that case nothing will subscribe to
    //             // its thenables. Instead, we'll transfer its thenables to the
    //             // SuspenseList so that it can retry if they resolve.
    //             // There might be multiple of these in the list but since we're
    //             // going to wait for all of them anyway, it doesn't really matter
    //             // which ones gets to ping. In theory we could get clever and keep
    //             // track of how many dependencies remain but it gets tricky because
    //             // in the meantime, we can add/remove/change items and dependencies.
    //             // We might bail out of the loop before finding any but that
    //             // doesn't matter since that means that the other boundaries that
    //             // we did find already has their listeners attached.
    //             const retryQueue: RetryQueue | null =
    //               (suspended.updateQueue: any);
    //             workInProgress.updateQueue = retryQueue;
    //             scheduleRetryEffect(workInProgress, retryQueue);

    //             // Rerender the whole list, but this time, we'll force fallbacks
    //             // to stay in place.
    //             // Reset the effect flags before doing the second pass since that's now invalid.
    //             // Reset the child fibers to their original state.
    //             workInProgress.subtreeFlags = NoFlags;
    //             resetChildFibers(workInProgress, renderLanes);

    //             // Set up the Suspense List Context to force suspense and
    //             // immediately rerender the children.
    //             pushSuspenseListContext(
    //               workInProgress,
    //               setShallowSuspenseListContext(
    //                 suspenseStackCursor.current,
    //                 ForceSuspenseFallback,
    //               ),
    //             );
    //             // Don't bubble properties in this case.
    //             return workInProgress.child;
    //           }
    //           row = row.sibling;
    //         }
    //       }

    //       if (renderState.tail !== null && now() > getRenderTargetTime()) {
    //         // We have already passed our CPU deadline but we still have rows
    //         // left in the tail. We'll just give up further attempts to render
    //         // the main content and only render fallbacks.
    //         workInProgress.flags |= DidCapture;
    //         didSuspendAlready = true;

    //         cutOffTailIfNeeded(renderState, false);

    //         // Since nothing actually suspended, there will nothing to ping this
    //         // to get it started back up to attempt the next item. While in terms
    //         // of priority this work has the same priority as this current render,
    //         // it's not part of the same transition once the transition has
    //         // committed. If it's sync, we still want to yield so that it can be
    //         // painted. Conceptually, this is really the same as pinging.
    //         // We can use any RetryLane even if it's the one currently rendering
    //         // since we're leaving it behind on this node.
    //         workInProgress.lanes = SomeRetryLane;
    //       }
    //     } else {
    //       cutOffTailIfNeeded(renderState, false);
    //     }
    //     // Next we're going to render the tail.
    //   } else {
    //     // Append the rendered row to the child list.
    //     if (!didSuspendAlready) {
    //       const suspended = findFirstSuspended(renderedTail);
    //       if (suspended !== null) {
    //         workInProgress.flags |= DidCapture;
    //         didSuspendAlready = true;

    //         // Ensure we transfer the update queue to the parent so that it doesn't
    //         // get lost if this row ends up dropped during a second pass.
    //         const retryQueue: RetryQueue | null = (suspended.updateQueue: any);
    //         workInProgress.updateQueue = retryQueue;
    //         scheduleRetryEffect(workInProgress, retryQueue);

    //         cutOffTailIfNeeded(renderState, true);
    //         // This might have been modified.
    //         if (
    //           renderState.tail === null &&
    //           renderState.tailMode === 'hidden' &&
    //           !renderedTail.alternate &&
    //           !getIsHydrating() // We don't cut it if we're hydrating.
    //         ) {
    //           // We're done.
    //           bubbleProperties(workInProgress);
    //           return null;
    //         }
    //       } else if (
    //         // The time it took to render last row is greater than the remaining
    //         // time we have to render. So rendering one more row would likely
    //         // exceed it.
    //         now() * 2 - renderState.renderingStartTime >
    //           getRenderTargetTime() &&
    //         renderLanes !== OffscreenLane
    //       ) {
    //         // We have now passed our CPU deadline and we'll just give up further
    //         // attempts to render the main content and only render fallbacks.
    //         // The assumption is that this is usually faster.
    //         workInProgress.flags |= DidCapture;
    //         didSuspendAlready = true;

    //         cutOffTailIfNeeded(renderState, false);

    //         // Since nothing actually suspended, there will nothing to ping this
    //         // to get it started back up to attempt the next item. While in terms
    //         // of priority this work has the same priority as this current render,
    //         // it's not part of the same transition once the transition has
    //         // committed. If it's sync, we still want to yield so that it can be
    //         // painted. Conceptually, this is really the same as pinging.
    //         // We can use any RetryLane even if it's the one currently rendering
    //         // since we're leaving it behind on this node.
    //         workInProgress.lanes = SomeRetryLane;
    //       }
    //     }
    //     if (renderState.isBackwards) {
    //       // The effect list of the backwards tail will have been added
    //       // to the end. This breaks the guarantee that life-cycles fire in
    //       // sibling order but that isn't a strong guarantee promised by React.
    //       // Especially since these might also just pop in during future commits.
    //       // Append to the beginning of the list.
    //       renderedTail.sibling = workInProgress.child;
    //       workInProgress.child = renderedTail;
    //     } else {
    //       const previousSibling = renderState.last;
    //       if (previousSibling !== null) {
    //         previousSibling.sibling = renderedTail;
    //       } else {
    //         workInProgress.child = renderedTail;
    //       }
    //       renderState.last = renderedTail;
    //     }
    //   }

    //   if (renderState.tail !== null) {
    //     // We still have tail rows to render.
    //     // Pop a row.
    //     const next = renderState.tail;
    //     renderState.rendering = next;
    //     renderState.tail = next.sibling;
    //     renderState.renderingStartTime = now();
    //     next.sibling = null;

    //     // Restore the context.
    //     // TODO: We can probably just avoid popping it instead and only
    //     // setting it the first time we go from not suspended to suspended.
    //     let suspenseContext = suspenseStackCursor.current;
    //     if (didSuspendAlready) {
    //       suspenseContext = setShallowSuspenseListContext(
    //         suspenseContext,
    //         ForceSuspenseFallback,
    //       );
    //     } else {
    //       suspenseContext =
    //         setDefaultShallowSuspenseListContext(suspenseContext);
    //     }
    //     pushSuspenseListContext(workInProgress, suspenseContext);
    //     // Do a pass over the next row.
    //     // Don't bubble properties in this case.
    //     return next;
    //   }
    //   bubbleProperties(workInProgress);
    //   return null;
    // }
    // case ScopeComponent: {
    //   if (enableScopeAPI) {
    //     if (current === null) {
    //       const scopeInstance: ReactScopeInstance = createScopeInstance();
    //       workInProgress.stateNode = scopeInstance;
    //       prepareScopeUpdate(scopeInstance, workInProgress);
    //       if (workInProgress.ref !== null) {
    //         markRef(workInProgress);
    //         markUpdate(workInProgress);
    //       }
    //     } else {
    //       if (workInProgress.ref !== null) {
    //         markUpdate(workInProgress);
    //       }
    //       if (current.ref !== workInProgress.ref) {
    //         markRef(workInProgress);
    //       }
    //     }
    //     bubbleProperties(workInProgress);
    //     return null;
    //   }
    //   break;
    // }
    // case OffscreenComponent:
    // case LegacyHiddenComponent: {
    //   popSuspenseHandler(workInProgress);
    //   popHiddenContext(workInProgress);
    //   const nextState: OffscreenState | null = workInProgress.memoizedState;
    //   const nextIsHidden = nextState !== null;

    //   // Schedule a Visibility effect if the visibility has changed
    //   if (enableLegacyHidden && workInProgress.tag === LegacyHiddenComponent) {
    //     // LegacyHidden doesn't do any hiding — it only pre-renders.
    //   } else {
    //     if (current !== null) {
    //       const prevState: OffscreenState | null = current.memoizedState;
    //       const prevIsHidden = prevState !== null;
    //       if (prevIsHidden !== nextIsHidden) {
    //         workInProgress.flags |= Visibility;
    //       }
    //     } else {
    //       // On initial mount, we only need a Visibility effect if the tree
    //       // is hidden.
    //       if (nextIsHidden) {
    //         workInProgress.flags |= Visibility;
    //       }
    //     }
    //   }

    //   if (!nextIsHidden || (workInProgress.mode & ConcurrentMode) === NoMode) {
    //     bubbleProperties(workInProgress);
    //   } else {
    //     // Don't bubble properties for hidden children unless we're rendering
    //     // at offscreen priority.
    //     if (
    //       includesSomeLane(renderLanes, (OffscreenLane: Lane)) &&
    //       // Also don't bubble if the tree suspended
    //       (workInProgress.flags & DidCapture) === NoLanes
    //     ) {
    //       bubbleProperties(workInProgress);
    //       // Check if there was an insertion or update in the hidden subtree.
    //       // If so, we need to hide those nodes in the commit phase, so
    //       // schedule a visibility effect.
    //       if (
    //         (!enableLegacyHidden ||
    //           workInProgress.tag !== LegacyHiddenComponent) &&
    //         workInProgress.subtreeFlags & (Placement | Update)
    //       ) {
    //         workInProgress.flags |= Visibility;
    //       }
    //     }
    //   }

    //   const offscreenQueue: OffscreenQueue | null =
    //     (workInProgress.updateQueue: any);
    //   if (offscreenQueue !== null) {
    //     const retryQueue = offscreenQueue.retryQueue;
    //     scheduleRetryEffect(workInProgress, retryQueue);
    //   }

    //   if (enableCache) {
    //     let previousCache: Cache | null = null;
    //     if (
    //       current !== null &&
    //       current.memoizedState !== null &&
    //       current.memoizedState.cachePool !== null
    //     ) {
    //       previousCache = current.memoizedState.cachePool.pool;
    //     }
    //     let cache: Cache | null = null;
    //     if (
    //       workInProgress.memoizedState !== null &&
    //       workInProgress.memoizedState.cachePool !== null
    //     ) {
    //       cache = workInProgress.memoizedState.cachePool.pool;
    //     }
    //     if (cache !== previousCache) {
    //       // Run passive effects to retain/release the cache.
    //       workInProgress.flags |= Passive;
    //     }
    //   }

    //   popTransition(workInProgress, current);

    //   return null;
    // }
    default:
      return null
  }
}

export { completeWork };