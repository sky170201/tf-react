import { enableCreateEventHandleAPI, enableFloat, enableUseEffectEventHook } from "shared/ReactFeatureFlags";
import { Fiber } from "./ReactInternalTypes";
import { BeforeMutationMask, ContentReset, MutationMask, NoFlags, Placement, Ref, Snapshot, Update } from "./ReactFiberFlags";
import {
  FunctionComponent,
  ForwardRef,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostText,
  HostPortal,
  Profiler,
  SuspenseComponent,
  DehydratedFragment,
  IncompleteClassComponent,
  MemoComponent,
  SimpleMemoComponent,
  SuspenseListComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
  TracingMarkerComponent,
} from './ReactWorkTags';
import { Lanes } from "./ReactFiberLane";
import { Instance, appendChild, appendChildToContainer, clearContainer, commitUpdate, insertBefore, insertInContainerBefore, resetTextContent, supportsMutation, supportsResources, supportsSingletons } from "react-dom-bindings/src/client/ReactFiberConfigDOM";
import { Container } from "index";

type FunctionComponentUpdateQueue = any

let nextEffect: Fiber | null = null;

let focusedInstanceHandle: null | Fiber = null;
let shouldFireAfterActiveInstanceBlur: boolean = false;

export function commitBeforeMutationEffects(
  root,
  firstChild: Fiber,
): boolean {
  // focusedInstanceHandle = prepareForCommit(root.containerInfo);

  nextEffect = firstChild;
  commitBeforeMutationEffects_begin();

  // We no longer need to track the active instance fiber
  const shouldFire = shouldFireAfterActiveInstanceBlur;
  shouldFireAfterActiveInstanceBlur = false;
  focusedInstanceHandle = null;

  return shouldFire;
}

function commitBeforeMutationEffects_begin() {
  while (nextEffect !== null) {
    const fiber = nextEffect;

    // This phase is only used for beforeActiveInstanceBlur.
    // Let's skip the whole loop if it's off.
    if (enableCreateEventHandleAPI) {
      // TODO: Should wrap this in flags check, too, as optimization
      const deletions = fiber.deletions;
      if (deletions !== null) {
        for (let i = 0; i < deletions.length; i++) {
          const deletion = deletions[i];
          // commitBeforeMutationEffectsDeletion(deletion);
        }
      }
    }

    const child = fiber.child;
    if (
      (fiber.subtreeFlags & BeforeMutationMask) !== NoFlags &&
      child !== null
    ) {
      child.return = fiber;
      nextEffect = child;
    } else {
      commitBeforeMutationEffects_complete();
    }
  }
}

function commitBeforeMutationEffects_complete() {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    // setCurrentDebugFiberInDEV(fiber);
    try {
      commitBeforeMutationEffectsOnFiber(fiber);
    } catch (error) {
      // captureCommitPhaseError(fiber, fiber.return, error);
    }
    // resetCurrentDebugFiberInDEV();

    const sibling = fiber.sibling;
    if (sibling !== null) {
      sibling.return = fiber.return;
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}

function commitBeforeMutationEffectsOnFiber(finishedWork: Fiber) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  if (enableCreateEventHandleAPI) {
    if (!shouldFireAfterActiveInstanceBlur && focusedInstanceHandle !== null) {
      // Check to see if the focused element was inside of a hidden (Suspense) subtree.
      // TODO: Move this out of the hot path using a dedicated effect tag.
      // if (
      //   finishedWork.tag === SuspenseComponent &&
      //   isSuspenseBoundaryBeingHidden(current, finishedWork) &&
      //   // $FlowFixMe[incompatible-call] found when upgrading Flow
      //   doesFiberContain(finishedWork, focusedInstanceHandle)
      // ) {
      //   shouldFireAfterActiveInstanceBlur = true;
      //   beforeActiveInstanceBlur(finishedWork);
      // }
    }
  }

  // if ((flags & Snapshot) !== NoFlags) {
  //   setCurrentDebugFiberInDEV(finishedWork);
  // }

  switch (finishedWork.tag) {
    case FunctionComponent: {
      if (enableUseEffectEventHook) {
        if ((flags & Update) !== NoFlags) {
          commitUseEffectEventMount(finishedWork);
        }
      }
      break;
    }
    case ForwardRef:
    case SimpleMemoComponent: {
      break;
    }
    case ClassComponent: {
      if ((flags & Snapshot) !== NoFlags) {
        if (current !== null) {
          const prevProps = current.memoizedProps;
          const prevState = current.memoizedState;
          const instance = finishedWork.stateNode;
          // We could update instance props and state here,
          // but instead we rely on them being set during last render.
          // TODO: revisit this when we implement resuming.
          // 执行getSnapshotBeforeUpdate生命周期钩子
          const snapshot = instance.getSnapshotBeforeUpdate(
            // finishedWork.elementType === finishedWork.type
            // ? 
            prevProps,
            // : resolveDefaultProps(finishedWork.type, prevProps),
            prevState,
          );
          instance.__reactInternalSnapshotBeforeUpdate = snapshot;
        }
      }
      break;
    }
    case HostRoot: {
      if ((flags & Snapshot) !== NoFlags) {
        if (supportsMutation) {
          const root = finishedWork.stateNode;
          clearContainer(root.containerInfo);
        }
      }
      break;
    }
    case HostComponent:
    case HostHoistable:
    case HostSingleton:
    case HostText:
    case HostPortal:
    case IncompleteClassComponent:
      // Nothing to do for these component types
      break;
    default: {
      if ((flags & Snapshot) !== NoFlags) {
        throw new Error(
          'This unit of work tag should not have side-effects. This error is ' +
          'likely caused by a bug in React. Please file an issue.',
        );
      }
    }
  }

  // if ((flags & Snapshot) !== NoFlags) {
  //   resetCurrentDebugFiberInDEV();
  // }
}

function commitUseEffectEventMount(finishedWork: Fiber) {
  const updateQueue: FunctionComponentUpdateQueue | null = finishedWork.updateQueue;
  const eventPayloads = updateQueue !== null ? updateQueue.events : null;
  if (eventPayloads !== null) {
    for (let ii = 0; ii < eventPayloads.length; ii++) {
      const { ref, nextImpl } = eventPayloads[ii];
      ref.impl = nextImpl;
    }
  }
}

// Used for Profiling builds to track updaters.
let inProgressLanes: Lanes | null = null;
let inProgressRoot = null;

export function commitMutationEffects(
  root,
  finishedWork: Fiber,
  committedLanes: Lanes,
) {
  inProgressLanes = committedLanes;
  inProgressRoot = root;

  // setCurrentDebugFiberInDEV(finishedWork);
  commitMutationEffectsOnFiber(finishedWork, root, committedLanes);
  // setCurrentDebugFiberInDEV(finishedWork);

  inProgressLanes = null;
  inProgressRoot = null;
}

let hostParent: Instance | Container | null = null;
let hostParentIsContainer: boolean = false;

function commitDeletionEffects(
  root,
  returnFiber: Fiber,
  deletedFiber: Fiber,
) {
  if (supportsMutation) {
    // 我们只删除了最上面的fiber，但是我们需要递归下去,子节点查找所有终端节点。递归地从父节点中删除所有节点，分离引用，清理，加载布局效果，调用componentWillUnmount。
    // 我们只需要移除每个分支中最顶层的宿主子节点。但是后来我们仍然需要继续遍历以卸载效果、refs和cWU。
    // 待办事项:我们可以把它分成两个独立的遍历函数，第二个呢一个不包含任何removeChild逻辑。这可能是一样的函数为“消失的layouteffects”(或任何变成之后布局阶段被重构为使用递归)。
    // 在开始之前，找到堆栈上最近的宿主父节点，这样我们就知道了要从哪个实例/容器中删除子对象。
    // 待办事项:我们不是在每次删除时都搜索光纤返回路径,可以在JS堆栈上跟踪最近的主机组件，因为我们遍历树。这也会使插入更快。
    let parent: null | Fiber = returnFiber;
    findParent: while (parent !== null) {
      switch (parent.tag) {
        case HostSingleton:
        case HostComponent: {
          hostParent = parent.stateNode;
          hostParentIsContainer = false;
          break findParent;
        }
        case HostRoot: {
          hostParent = parent.stateNode.containerInfo;
          hostParentIsContainer = true;
          break findParent;
        }
        case HostPortal: {
          hostParent = parent.stateNode.containerInfo;
          hostParentIsContainer = true;
          break findParent;
        }
      }
      parent = parent.return;
    }
    if (hostParent === null) {
      throw new Error(
        'Expected to find a host parent. This error is likely caused by ' +
        'a bug in React. Please file an issue.',
      );
    }

    commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);
    hostParent = null;
    hostParentIsContainer = false;
  } else {
    // Detach refs and call componentWillUnmount() on the whole subtree.
    commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);
  }

  detachFiberMutation(deletedFiber);
}

function commitDeletionEffectsOnFiber(
  finishedRoot,
  nearestMountedAncestor: Fiber,
  deletedFiber: Fiber,
) {
  // DevToolsHook
  // onCommitUnmount(deletedFiber);

  // The cases in this outer switch modify the stack before they traverse
  // into their subtree. There are simpler cases in the inner switch
  // that don't modify the stack.
  switch (deletedFiber.tag) {
    case HostComponent: {
      // if (!offscreenSubtreeWasHidden) {
      //   safelyDetachRef(deletedFiber, nearestMountedAncestor);
      // }
      // Intentional fallthrough to next branch
    }
    case HostText: {
      // We only need to remove the nearest host child. Set the host parent
      // to `null` on the stack to indicate that nested children don't
      // need to be removed.
      if (supportsMutation) {
        const prevHostParent = hostParent;
        const prevHostParentIsContainer = hostParentIsContainer;
        hostParent = null;
        // recursivelyTraverseDeletionEffects(
        //   finishedRoot,
        //   nearestMountedAncestor,
        //   deletedFiber,
        // );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;

        if (hostParent !== null) {
          // Now that all the child effects have unmounted, we can remove the
          // node from the tree.
          // if (hostParentIsContainer) {
          //   removeChildFromContainer(
          //     ((hostParent: any): Container),
          //     (deletedFiber.stateNode: Instance | TextInstance),
          //   );
          // } else {
          //   removeChild(
          //     ((hostParent: any): Instance),
          //     (deletedFiber.stateNode: Instance | TextInstance),
          //   );
          // }
        }
      }
      return;
    }
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      // recursivelyTraverseDeletionEffects(
      //   finishedRoot,
      //   nearestMountedAncestor,
      //   deletedFiber,
      // );
      return;
    }
    case ClassComponent: {
      // recursivelyTraverseDeletionEffects(
      //   finishedRoot,
      //   nearestMountedAncestor,
      //   deletedFiber,
      // );
      return;
    }
    default: {
      // recursivelyTraverseDeletionEffects(
      //   finishedRoot,
      //   nearestMountedAncestor,
      //   deletedFiber,
      // );
      return;
    }
  }
}

function detachFiberMutation(fiber: Fiber) {
  // 切断返回指针以断开它与树的连接
  const alternate = fiber.alternate;
  if (alternate !== null) {
    alternate.return = null;
  }
  fiber.return = null;
}

function recursivelyTraverseMutationEffects(
  root,
  parentFiber: Fiber,
  lanes: Lanes,
) {
  // Deletions effects can be scheduled on any fiber type. They need to happen
  // before the children effects hae fired.
  const deletions = parentFiber.deletions;
  if (deletions !== null) {
    for (let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i];
      try {
        commitDeletionEffects(root, parentFiber, childToDelete);
      } catch (error) {
        // captureCommitPhaseError(childToDelete, parentFiber, error);
      }
    }
  }
  if (parentFiber.subtreeFlags & MutationMask) {
    let child = parentFiber.child;
    while (child !== null) {
      commitMutationEffectsOnFiber(child, root, lanes);
      child = child.sibling;
    }
  }
}

function commitReconciliationEffects(finishedWork: Fiber) {
  // Placement effects (insertions, reorders) can be scheduled on any fiber
  // type. They needs to happen after the children effects have fired, but
  // before the effects on this fiber have fired.
  const flags = finishedWork.flags;
  if (flags & Placement) {
    try {
      commitPlacement(finishedWork);
    } catch (error) {
      // captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
    // Clear the "placement" from effect tag so that we know that this is
    // inserted, before any life-cycles like componentDidMount gets called.
    // TODO: findDOMNode doesn't rely on this any more but isMounted does
    // and isMounted is deprecated anyway so we should be able to kill this.
    finishedWork.flags &= ~Placement;
  }
}

function isHostParent(fiber: Fiber): boolean {
  return (
    fiber.tag === HostComponent ||
    fiber.tag === HostRoot ||
    (enableFloat && supportsResources ? fiber.tag === HostHoistable : false) ||
    (supportsSingletons ? fiber.tag === HostSingleton : false) ||
    fiber.tag === HostPortal
  );
}

function getHostParentFiber(fiber: Fiber): Fiber {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }

  throw new Error(
    'Expected to find a host parent. This error is likely caused by a bug ' +
      'in React. Please file an issue.',
  );
}

function getHostSibling(fiber: Fiber): Instance | null {
  // We're going to search forward into the tree until we find a sibling host
  // node. Unfortunately, if multiple insertions are done in a row we have to
  // search past them. This leads to exponential search for the next sibling.
  // TODO: Find a more efficient way to do this.
  let node: Fiber = fiber;
  siblings: while (true) {
    // If we didn't find anything, let's try the next sibling.
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        // If we pop out of the root or hit the parent the fiber we are the
        // last sibling.
        return null;
      }
      // $FlowFixMe[incompatible-type] found when upgrading Flow
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
    while (
      node.tag !== HostComponent &&
      node.tag !== HostText &&
      (!supportsSingletons ? true : node.tag !== HostSingleton) &&
      node.tag !== DehydratedFragment
    ) {
      // If it is not host node and, we might have a host node inside it.
      // Try to search down until we find one.
      if (node.flags & Placement) {
        // If we don't have a child, try the siblings instead.
        continue siblings;
      }
      // If we don't have a child, try the siblings instead.
      // We also skip portals because they are not part of this host tree.
      if (node.child === null || node.tag === HostPortal) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }
    // Check if this host node is stable or about to be placed.
    if (!(node.flags & Placement)) {
      // Found it!
      return node.stateNode;
    }
  }
}

function insertOrAppendPlacementNode(
  node: Fiber,
  before: Instance,
  parent: Instance,
): void {
  const {tag} = node;
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const stateNode = node.stateNode;
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      appendChild(parent, stateNode);
    }
  } else if (
    tag === HostPortal ||
    (supportsSingletons ? tag === HostSingleton : false)
  ) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
    // If the insertion is a HostSingleton then it will be placed independently
  } else {
    const child = node.child;
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent);
      let sibling = child.sibling;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

export function commitPlacement(finishedWork: Fiber): void {
  if (!supportsMutation) {
    return;
  }

  if (supportsSingletons) {
    if (finishedWork.tag === HostSingleton) {
      // Singletons are already in the Host and don't need to be placed
      // Since they operate somewhat like Portals though their children will
      // have Placement and will get placed inside them
      return;
    }
  }
  // Recursively insert all host nodes into the parent.
  const parentFiber = getHostParentFiber(finishedWork);

  switch (parentFiber.tag) {
    case HostSingleton: {
      if (supportsSingletons) {
        const parent: Instance = parentFiber.stateNode;
        const before: any = getHostSibling(finishedWork);
        // We only have the top Fiber that was inserted but we need to recurse down its
        // children to find all the terminal nodes.
        insertOrAppendPlacementNode(finishedWork, before, parent);
        break;
      }
      // Fall through
    }
    case HostComponent: {
      const parent: Instance = parentFiber.stateNode;
      if (parentFiber.flags & ContentReset) {
        // Reset the text content of the parent before doing any insertions
        resetTextContent(parent);
        // Clear ContentReset from the effect tag
        parentFiber.flags &= ~ContentReset;
      }

      const before: any = getHostSibling(finishedWork);
      // We only have the top Fiber that was inserted but we need to recurse down its
      // children to find all the terminal nodes.
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    case HostRoot:
    case HostPortal: {
      const parent: Container = parentFiber.stateNode.containerInfo;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
      break;
    }
    default:
      throw new Error(
        'Invalid host parent fiber. This error is likely caused by a bug ' +
          'in React. Please file an issue.',
      );
  }
}

function insertOrAppendPlacementNodeIntoContainer(
  node: Fiber,
  before: Instance,
  parent: Container,
): void {
  const {tag} = node;
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const stateNode = node.stateNode;
    if (before) {
      insertInContainerBefore(parent, stateNode, before);
    } else {
      appendChildToContainer(parent, stateNode);
    }
  } else if (
    tag === HostPortal ||
    (supportsSingletons ? tag === HostSingleton : false)
  ) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
    // If the insertion is a HostSingleton then it will be placed independently
  } else {
    const child = node.child;
    if (child !== null) {
      insertOrAppendPlacementNodeIntoContainer(child, before, parent);
      let sibling = child.sibling;
      while (sibling !== null) {
        insertOrAppendPlacementNodeIntoContainer(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

function commitMutationEffectsOnFiber(
  finishedWork: Fiber,
  root,
  lanes: Lanes,
) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  // The effect flag should be checked *after* we refine the type of fiber,
  // because the fiber tag is more specific. An exception is any flag related
  // to reconciliation, because those can be set on all fiber types.
  console.log('finishedWork.tag', finishedWork.tag)
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      // if (flags & Update) {
      //   try {
      //     commitHookEffectListUnmount(
      //       HookInsertion | HookHasEffect,
      //       finishedWork,
      //       finishedWork.return,
      //     );
      //     commitHookEffectListMount(
      //       HookInsertion | HookHasEffect,
      //       finishedWork,
      //     );
      //   } catch (error) {
      //     captureCommitPhaseError(finishedWork, finishedWork.return, error);
      //   }
      //   // Layout effects are destroyed during the mutation phase so that all
      //   // destroy functions for all fibers are called before any create functions.
      //   // This prevents sibling component effects from interfering with each other,
      //   // e.g. a destroy function in one component should never override a ref set
      //   // by a create function in another component during the same commit.
      //   if (shouldProfile(finishedWork)) {
      //     try {
      //       startLayoutEffectTimer();
      //       commitHookEffectListUnmount(
      //         HookLayout | HookHasEffect,
      //         finishedWork,
      //         finishedWork.return,
      //       );
      //     } catch (error) {
      //       captureCommitPhaseError(finishedWork, finishedWork.return, error);
      //     }
      //     recordLayoutEffectDuration(finishedWork);
      //   } else {
      //     try {
      //       commitHookEffectListUnmount(
      //         HookLayout | HookHasEffect,
      //         finishedWork,
      //         finishedWork.return,
      //       );
      //     } catch (error) {
      //       captureCommitPhaseError(finishedWork, finishedWork.return, error);
      //     }
      //   }
      // }
      return;
    }
    case ClassComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      if (flags & Ref) {
        if (current !== null) {
          // safelyDetachRef(current, current.return);
        }
      }

      // if (flags & Callback && offscreenSubtreeIsHidden) {
      //   const updateQueue: UpdateQueue<mixed> | null =
      //     (finishedWork.updateQueue: any);
      //   if (updateQueue !== null) {
      //     deferHiddenCallbacks(updateQueue);
      //   }
      // }
      return;
    }
    // case HostHoistable: {
    //   if (enableFloat && supportsResources) {
    //     // We cast because we always set the root at the React root and so it cannot be
    //     // null while we are processing mutation effects
    //     const hoistableRoot = currentHoistableRoot;
    //     recursivelyTraverseMutationEffects(root, finishedWork, lanes);
    //     commitReconciliationEffects(finishedWork);

    //     if (flags & Ref) {
    //       if (current !== null) {
    //         safelyDetachRef(current, current.return);
    //       }
    //     }

    //     if (flags & Update) {
    //       const currentResource =
    //         current !== null ? current.memoizedState : null;
    //       const newResource = finishedWork.memoizedState;
    //       if (current === null) {
    //         // We are mounting a new HostHoistable Fiber. We fork the mount
    //         // behavior based on whether this instance is a Hoistable Instance
    //         // or a Hoistable Resource
    //         if (newResource === null) {
    //           if (finishedWork.stateNode === null) {
    //             // finishedWork.stateNode = hydrateHoistable(
    //             //   hoistableRoot,
    //             //   finishedWork.type,
    //             //   finishedWork.memoizedProps,
    //             //   finishedWork,
    //             // );
    //           } else {
    //             mountHoistable(
    //               hoistableRoot,
    //               finishedWork.type,
    //               finishedWork.stateNode,
    //             );
    //           }
    //         } else {
    //           finishedWork.stateNode = acquireResource(
    //             hoistableRoot,
    //             newResource,
    //             finishedWork.memoizedProps,
    //           );
    //         }
    //       } else if (currentResource !== newResource) {
    //         // We are moving to or from Hoistable Resource, or between different Hoistable Resources
    //         if (currentResource === null) {
    //           if (current.stateNode !== null) {
    //             unmountHoistable(current.stateNode);
    //           }
    //         } else {
    //           releaseResource(currentResource);
    //         }
    //         if (newResource === null) {
    //           mountHoistable(
    //             hoistableRoot,
    //             finishedWork.type,
    //             finishedWork.stateNode,
    //           );
    //         } else {
    //           acquireResource(
    //             hoistableRoot,
    //             newResource,
    //             finishedWork.memoizedProps,
    //           );
    //         }
    //       } else if (newResource === null && finishedWork.stateNode !== null) {
    //         // We may have an update on a Hoistable element
    //         const updatePayload: null | UpdatePayload =
    //           (finishedWork.updateQueue: any);
    //         finishedWork.updateQueue = null;
    //         try {
    //           commitUpdate(
    //             finishedWork.stateNode,
    //             updatePayload,
    //             finishedWork.type,
    //             current.memoizedProps,
    //             finishedWork.memoizedProps,
    //             finishedWork,
    //           );
    //         } catch (error) {
    //           captureCommitPhaseError(finishedWork, finishedWork.return, error);
    //         }
    //       }
    //     }
    //     return;
    //   }
    //   // Fall through
    // }
    case HostSingleton: {
      if (supportsSingletons) {
        if (flags & Update) {
          const previousWork = finishedWork.alternate;
          if (previousWork === null) {
            const singleton = finishedWork.stateNode;
            const props = finishedWork.memoizedProps;
            // This was a new mount, we need to clear and set initial properties
            // clearSingleton(singleton);
            // acquireSingletonInstance(
            //   finishedWork.type,
            //   props,
            //   singleton,
            //   finishedWork,
            // );
          }
        }
      }
      // Fall through
    }
    case HostComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      // if (flags & Ref) {
      //   if (current !== null) {
      //     safelyDetachRef(current, current.return);
      //   }
      // }
      if (supportsMutation) {
        // TODO: ContentReset gets cleared by the children during the commit
        // phase. This is a refactor hazard because it means we must read
        // flags the flags after `commitReconciliationEffects` has already run;
        // the order matters. We should refactor so that ContentReset does not
        // rely on mutating the flag during commit. Like by setting a flag
        // during the render phase instead.
        if (finishedWork.flags & ContentReset) {
          const instance: Instance = finishedWork.stateNode;
          try {
            resetTextContent(instance);
          } catch (error) {
            // captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }

        if (flags & Update) {
          const instance: Instance = finishedWork.stateNode;
          if (instance != null) {
            // Commit the work prepared earlier.
            const newProps = finishedWork.memoizedProps;
            // For hydration we reuse the update path but we treat the oldProps
            // as the newProps. The updatePayload will contain the real change in
            // this case.
            const oldProps =
              current !== null ? current.memoizedProps : newProps;
            const type = finishedWork.type;
            // TODO: Type the updateQueue to be specific to host components.
            const updatePayload: any = finishedWork.updateQueue
            finishedWork.updateQueue = null;
            try {
              commitUpdate(
                instance,
                updatePayload,
                type,
                oldProps,
                newProps,
                finishedWork,
              );
            } catch (error) {
              // captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
        }
      }
      return;
    }
    case HostText: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      if (flags & Update) {
        // if (supportsMutation) {
        //   if (finishedWork.stateNode === null) {
        //     throw new Error(
        //       'This should have a text node initialized. This error is likely ' +
        //         'caused by a bug in React. Please file an issue.',
        //     );
        //   }

        //   const textInstance: TextInstance = finishedWork.stateNode;
        //   const newText: string = finishedWork.memoizedProps;
        //   // For hydration we reuse the update path but we treat the oldProps
        //   // as the newProps. The updatePayload will contain the real change in
        //   // this case.
        //   const oldText: string =
        //     current !== null ? current.memoizedProps : newText;

        //   try {
        //     commitTextUpdate(textInstance, oldText, newText);
        //   } catch (error) {
        //     captureCommitPhaseError(finishedWork, finishedWork.return, error);
        //   }
        // }
      }
      return;
    }
    case HostRoot: {
      // if (enableFloat && supportsResources) {
      //   prepareToCommitHoistables();

      //   const previousHoistableRoot = currentHoistableRoot;
      //   currentHoistableRoot = getHoistableRoot(root.containerInfo);

      //   recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      //   currentHoistableRoot = previousHoistableRoot;

      //   commitReconciliationEffects(finishedWork);
      // } else {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      // }

      if (flags & Update) {
        // if (supportsPersistence) {
        //   const containerInfo = root.containerInfo;
        //   const pendingChildren = root.pendingChildren;
        //   try {
        //     replaceContainerChildren(containerInfo, pendingChildren);
        //   } catch (error) {
        //     captureCommitPhaseError(finishedWork, finishedWork.return, error);
        //   }
        // }
      }
      return;
    }
    case HostPortal: {
      // if (enableFloat && supportsResources) {
      //   const previousHoistableRoot = currentHoistableRoot;
      //   currentHoistableRoot = getHoistableRoot(
      //     finishedWork.stateNode.containerInfo,
      //   );
      //   recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      //   commitReconciliationEffects(finishedWork);
      //   currentHoistableRoot = previousHoistableRoot;
      // } else {
      //   recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      //   commitReconciliationEffects(finishedWork);
      // }

      // if (flags & Update) {
      //   if (supportsPersistence) {
      //     const portal = finishedWork.stateNode;
      //     const containerInfo = portal.containerInfo;
      //     const pendingChildren = portal.pendingChildren;
      //     try {
      //       replaceContainerChildren(containerInfo, pendingChildren);
      //     } catch (error) {
      //       captureCommitPhaseError(finishedWork, finishedWork.return, error);
      //     }
      //   }
      // }
      return;
    }
    case SuspenseComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      // TODO: We should mark a flag on the Suspense fiber itself, rather than
      // relying on the Offscreen fiber having a flag also being marked. The
      // reason is that this offscreen fiber might not be part of the work-in-
      // progress tree! It could have been reused from a previous render. This
      // doesn't lead to incorrect behavior because we don't rely on the flag
      // check alone; we also compare the states explicitly below. But for
      // modeling purposes, we _should_ be able to rely on the flag check alone.
      // So this is a bit fragile.
      //
      // Also, all this logic could/should move to the passive phase so it
      // doesn't block paint.
      // const offscreenFiber: Fiber = (finishedWork.child: any);
      // if (offscreenFiber.flags & Visibility) {
      //   // Throttle the appearance and disappearance of Suspense fallbacks.
      //   const isShowingFallback =
      //     (finishedWork.memoizedState: SuspenseState | null) !== null;
      //   const wasShowingFallback =
      //     current !== null &&
      //     (current.memoizedState: SuspenseState | null) !== null;

      //   if (alwaysThrottleRetries) {
      //     if (isShowingFallback !== wasShowingFallback) {
      //       // A fallback is either appearing or disappearing.
      //       markCommitTimeOfFallback();
      //     }
      //   } else {
      //     if (isShowingFallback && !wasShowingFallback) {
      //       // Old behavior. Only mark when a fallback appears, not when
      //       // it disappears.
      //       markCommitTimeOfFallback();
      //     }
      //   }
      // }

      // if (flags & Update) {
      //   try {
      //     commitSuspenseCallback(finishedWork);
      //   } catch (error) {
      //     captureCommitPhaseError(finishedWork, finishedWork.return, error);
      //   }
      //   const retryQueue: RetryQueue | null = (finishedWork.updateQueue: any);
      //   if (retryQueue !== null) {
      //     finishedWork.updateQueue = null;
      //     attachSuspenseRetryListeners(finishedWork, retryQueue);
      //   }
      // }
      return;
    }
    // case OffscreenComponent: {
    //   if (flags & Ref) {
    //     if (current !== null) {
    //       safelyDetachRef(current, current.return);
    //     }
    //   }

    //   const newState: OffscreenState | null = finishedWork.memoizedState;
    //   const isHidden = newState !== null;
    //   const wasHidden = current !== null && current.memoizedState !== null;

    //   if (finishedWork.mode & ConcurrentMode) {
    //     // Before committing the children, track on the stack whether this
    //     // offscreen subtree was already hidden, so that we don't unmount the
    //     // effects again.
    //     const prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden;
    //     const prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
    //     offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || isHidden;
    //     offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || wasHidden;
    //     recursivelyTraverseMutationEffects(root, finishedWork, lanes);
    //     offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
    //     offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
    //   } else {
    //     recursivelyTraverseMutationEffects(root, finishedWork, lanes);
    //   }

    //   commitReconciliationEffects(finishedWork);

    //   const offscreenInstance: OffscreenInstance = finishedWork.stateNode;

    //   // TODO: Add explicit effect flag to set _current.
    //   offscreenInstance._current = finishedWork;

    //   // Offscreen stores pending changes to visibility in `_pendingVisibility`. This is
    //   // to support batching of `attach` and `detach` calls.
    //   offscreenInstance._visibility &= ~OffscreenDetached;
    //   offscreenInstance._visibility |=
    //     offscreenInstance._pendingVisibility & OffscreenDetached;

    //   if (flags & Visibility) {
    //     // Track the current state on the Offscreen instance so we can
    //     // read it during an event
    //     // if (isHidden) {
    //     //   offscreenInstance._visibility &= ~OffscreenVisible;
    //     // } else {
    //     //   offscreenInstance._visibility |= OffscreenVisible;
    //     // }

    //     if (isHidden) {
    //       const isUpdate = current !== null;
    //       const wasHiddenByAncestorOffscreen =
    //         offscreenSubtreeIsHidden || offscreenSubtreeWasHidden;
    //       // Only trigger disapper layout effects if:
    //       //   - This is an update, not first mount.
    //       //   - This Offscreen was not hidden before.
    //       //   - Ancestor Offscreen was not hidden in previous commit.
    //       if (isUpdate && !wasHidden && !wasHiddenByAncestorOffscreen) {
    //         if ((finishedWork.mode & ConcurrentMode) !== NoMode) {
    //           // Disappear the layout effects of all the children
    //           recursivelyTraverseDisappearLayoutEffects(finishedWork);
    //         }
    //       }
    //     } else {
    //       if (wasHidden) {
    //         // TODO: Move re-appear call here for symmetry?
    //       }
    //     }

    //     // Offscreen with manual mode manages visibility manually.
    //     // if (supportsMutation && !isOffscreenManual(finishedWork)) {
    //     //   // TODO: This needs to run whenever there's an insertion or update
    //     //   // inside a hidden Offscreen tree.
    //     //   hideOrUnhideAllChildren(finishedWork, isHidden);
    //     // }
    //   }

    //   // TODO: Move to passive phase
    //   if (flags & Update) {
    //     const offscreenQueue = finishedWork.updateQueue
    //     if (offscreenQueue !== null) {
    //       const retryQueue = offscreenQueue.retryQueue;
    //       if (retryQueue !== null) {
    //         offscreenQueue.retryQueue = null;
    //         // attachSuspenseRetryListeners(finishedWork, retryQueue);
    //       }
    //     }
    //   }
    //   return;
    // }
    case SuspenseListComponent: {
      // recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      // commitReconciliationEffects(finishedWork);

      // if (flags & Update) {
      //   const retryQueue: Set<Wakeable> | null =
      //     (finishedWork.updateQueue: any);
      //   if (retryQueue !== null) {
      //     finishedWork.updateQueue = null;
      //     attachSuspenseRetryListeners(finishedWork, retryQueue);
      //   }
      // }
      return;
    }
    case ScopeComponent: {
      // if (enableScopeAPI) {
      //   recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      //   commitReconciliationEffects(finishedWork);

      //   // TODO: This is a temporary solution that allowed us to transition away
      //   // from React Flare on www.
      //   if (flags & Ref) {
      //     if (current !== null) {
      //       safelyDetachRef(finishedWork, finishedWork.return);
      //     }
      //     safelyAttachRef(finishedWork, finishedWork.return);
      //   }
      //   if (flags & Update) {
      //     const scopeInstance = finishedWork.stateNode;
      //     prepareScopeUpdate(scopeInstance, finishedWork);
      //   }
      // }
      return;
    }
    default: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      return;
    }
  }
}