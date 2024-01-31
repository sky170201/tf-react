import { NoFlags, StaticMask, Update } from "./ReactFiberFlags";
import { Lanes, NoLanes, mergeLanes } from "./ReactFiberLane";
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
  // 冒泡收集子节点的副作用
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
    //   let treeBaseDuration = ((completedWork.selfBaseDuration as any) as number);

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

    //     treeBaseDuration += child.treeBaseDuration;
    //     child = child.sibling;
    //   }

    //   completedWork.treeBaseDuration = treeBaseDuration;
    // } else {
    let child = completedWork.child;
    while (child !== null) {
      newChildLanes = mergeLanes(
        newChildLanes,
        mergeLanes(child.lanes, child.childLanes),
      );

      // "Static" flags share the lifetime of the fiber/hook they belong to,
      // so we should bubble those up even during a bailout. All the other
      // flags have a lifetime only of a single render + commit, so we should
      // ignore them.
      subtreeFlags |= child.subtreeFlags & StaticMask;
      subtreeFlags |= child.flags & StaticMask;

      // Update the return pointer so the tree is consistent. This is a code
      // smell because it assumes the commit phase is never concurrent with
      // the render phase. Will address during refactor to alternate model.
      child.return = completedWork;

      child = child.sibling;
    }
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

function updateHostText(
  current: Fiber,
  workInProgress: Fiber,
  oldText: string,
  newText: string,
) {
  if (supportsMutation) {
    // If the text differs, mark it as an update. All the work in done in commitWork.
    if (oldText !== newText) {
      markUpdate(workInProgress);
    }
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

/**
 * completeWork阶段
 * 1、创建元素实例
 * 2、添加到父元素节点上，初始化属性
 * 3、标记更新，冒泡副作用
 */
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

      return null;
    }
    case HostText: {
      const newText = newProps;
      if (current && workInProgress.stateNode != null) {
        const oldText = current.memoizedProps;
        // If we have an alternate, that means this is an update and we need
        // to schedule a side-effect to do the updates.
        updateHostText(current, workInProgress, oldText, newText);
      } else {
        if (typeof newText !== 'string') {
          if (workInProgress.stateNode === null) {
            throw new Error(
              'We must have new props for new mounts. This error is likely ' +
              'caused by a bug in React. Please file an issue.',
            );
          }
          // This can happen when we abort work.
        }
        // const rootContainerInstance = getRootHostContainer();
        // const currentHostContext = getHostContext();
        workInProgress.stateNode = createTextInstance(
          newText,
          // rootContainerInstance,
          // currentHostContext,
          // workInProgress,
        );
      }
      bubbleProperties(workInProgress);
    }
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
    default:
      return null
  }
}

export { completeWork };