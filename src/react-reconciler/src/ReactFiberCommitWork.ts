import { enableCreateEventHandleAPI, enableFloat, enableSchedulingProfiler, enableScopeAPI, enableUseEffectEventHook } from "shared/ReactFeatureFlags";
import { Fiber } from "./ReactInternalTypes";
import { BeforeMutationMask, Callback, ChildDeletion, ContentReset, LayoutMask, MutationMask, NoFlags, Passive, PassiveMask, Placement, Ref, Snapshot, Update } from "./ReactFiberFlags";
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
import { Instance, TextInstance, appendChild, appendChildToContainer, clearContainer, commitTextUpdate, commitUpdate, getPublicInstance, insertBefore, insertInContainerBefore, removeChild, removeChildFromContainer, resetTextContent, supportsMutation, supportsResources, supportsSingletons } from "react-dom-bindings/src/client/ReactFiberConfigDOM";
import { Container } from "index";
import {
  NoFlags as NoHookEffect,
  HasEffect as HookHasEffect,
  Layout as HookLayout,
  Insertion as HookInsertion,
  Passive as HookPassive,
  HookFlags,
} from './ReactHookEffectTags';
import { UpdateQueue } from "./ReactFiberHooks";
import { ConcurrentMode, NoMode } from "./ReactTypeOfMode";
import { OffscreenInstance, OffscreenPassiveEffectsConnected, OffscreenState } from "./ReactFiberActivityComponent";
import { detachDeletedInstance } from "react-dom-bindings/src/client/ReactDOMComponentTree";

type FunctionComponentUpdateQueue = any

let nextEffect: Fiber | null = null;

let focusedInstanceHandle: null | Fiber = null;
let shouldFireAfterActiveInstanceBlur: boolean = false;

// Used during the commit phase to track the state of the Offscreen component stack.
// Allows us to avoid traversing the return path to find the nearest Offscreen ancestor.
let offscreenSubtreeIsHidden: boolean = false;
let offscreenSubtreeWasHidden: boolean = false;

// Capture errors so they don't interrupt mounting.
function safelyAttachRef(current: Fiber, nearestMountedAncestor: Fiber | null) {
  try {
    commitAttachRef(current);
  } catch (error) {
    // captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}

function shouldProfile(current: Fiber): boolean {
  return false // (
  // enableProfilerTimer &&
  // enableProfilerCommitHooks &&
  // (current.mode & ProfileMode) !== NoMode &&
  // (getExecutionContext() & CommitContext) !== NoContext
  // );
}

function safelyCallDestroy(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
  destroy: () => void,
) {
  try {
    destroy();
  } catch (error) {
    // captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}

function commitAttachRef(finishedWork: Fiber) {
  const ref: any = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode;
    let instanceToUse;
    switch (finishedWork.tag) {
      case HostHoistable:
      case HostSingleton:
      case HostComponent:
        instanceToUse = getPublicInstance(instance);
        break;
      default:
        instanceToUse = instance;
    }
    // Moved outside to ensure DCE works with this flag
    if (enableScopeAPI && finishedWork.tag === ScopeComponent) {
      instanceToUse = instance;
    }
    if (typeof ref === 'function') {
      if (shouldProfile(finishedWork)) {
        try {
          // startLayoutEffectTimer();
          finishedWork.refCleanup = ref(instanceToUse);
        } finally {
          // recordLayoutEffectDuration(finishedWork);
        }
      } else {
        finishedWork.refCleanup = ref(instanceToUse);
      }
    } else {
      // $FlowFixMe[incompatible-use] unable to narrow type to the non-function case
      ref.current = instanceToUse;
    }
  }
}

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

function recursivelyTraverseDeletionEffects(
  finishedRoot: any,
  nearestMountedAncestor: Fiber,
  parent: Fiber,
) {
  // TODO: Use a static flag to skip trees that don't have unmount effects
  let child = parent.child;
  while (child !== null) {
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, child);
    child = child.sibling;
  }
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
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber,
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;

        if (hostParent !== null) {
          // Now that all the child effects have unmounted, we can remove the
          // node from the tree.
          // 所有子节点的副作用已经卸载，可以从DOM tree中移除这个节点了
          if (hostParentIsContainer) {
            removeChildFromContainer(
              ((hostParent as any) as Container),
              (deletedFiber.stateNode as Instance | TextInstance),
            );
          } else {
            removeChild(
              ((hostParent as any) as Instance),
              (deletedFiber.stateNode as Instance | TextInstance),
            );
          }
        }
      }
      return;
    }
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      return;
    }
    case ClassComponent: {
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
      return;
    }
    default: {
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber,
      );
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

/**
 * commit提交阶段执行commitMutationEffectsOnFiber
 * 递归处理
 * 1、删除节点
 * 2、更新DOM内容
 */
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
  // 子节点的没有副作用的话，不会往下走
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
  const { tag } = node;
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
  const { tag } = node;
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

/**
 * 根据副作用真正更新DOM内容
 */
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
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      // 执行更新的副作用，带Update标记的副作用
      // 例如useLayoutEffect
      if (flags & Update) {
        try {
          // 执行的HookInsertion副作用
          commitHookEffectListUnmount(
            HookInsertion | HookHasEffect,
            finishedWork,
            finishedWork.return,
          );
          commitHookEffectListMount(
            HookInsertion | HookHasEffect,
            finishedWork,
          );
        } catch (error) {
          // captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
        // Layout effects are destroyed during the mutation phase so that all
        // destroy functions for all fibers are called before any create functions.
        // This prevents sibling component effects from interfering with each other,
        // e.g. a destroy function in one component should never override a ref set
        // by a create function in another component during the same commit.
        if (shouldProfile(finishedWork)) {
          try {
            // startLayoutEffectTimer();
            // 在comit阶段，先执行effect的destory
            commitHookEffectListUnmount(
              HookLayout | HookHasEffect,
              finishedWork,
              finishedWork.return,
            );
          } catch (error) {
            // captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
          // recordLayoutEffectDuration(finishedWork);
        } else {
          try {
            // 在comit阶段，先执行effect的destory
            // useLayoutEffect
            commitHookEffectListUnmount(
              HookLayout | HookHasEffect,
              finishedWork,
              finishedWork.return,
            );
          } catch (error) {
            // captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
      }
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
              // 更新属性
              // 1、props里有children属性时，在HostText条件分支里已经处理过了，这里再处理children属性多余了吧
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
        if (supportsMutation) {
          if (finishedWork.stateNode === null) {
            throw new Error(
              'This should have a text node initialized. This error is likely ' +
              'caused by a bug in React. Please file an issue.',
            );
          }

          const textInstance: TextInstance = finishedWork.stateNode;
          const newText: string = finishedWork.memoizedProps;
          // For hydration we reuse the update path but we treat the oldProps
          // as the newProps. The updatePayload will contain the real change in
          // this case.
          const oldText: string =
            current !== null ? current.memoizedProps : newText;

          try {
            commitTextUpdate(textInstance, oldText, newText);
          } catch (error) {
            // captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
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

export function commitLayoutEffects(
  finishedWork: Fiber,
  root,
  committedLanes: Lanes,
): void {
  inProgressLanes = committedLanes;
  inProgressRoot = root;

  const current = finishedWork.alternate;
  commitLayoutEffectOnFiber(root, current, finishedWork, committedLanes);

  inProgressLanes = null;
  inProgressRoot = null;
}

function commitLayoutEffectOnFiber(
  finishedRoot,
  current: Fiber | null,
  finishedWork: Fiber,
  committedLanes: Lanes,
): void {
  // When updating this function, also update reappearLayoutEffects, which does
  // most of the same things when an offscreen tree goes from hidden -> visible.
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      // useLayoutEffect视图渲染后会同步执行HookLayout | HookHasEffect
      // useEffect需要下次调度时才会执行
      if (flags & Update) {
        commitHookLayoutEffects(finishedWork, HookLayout | HookHasEffect);
      }
      break;
    }
    case ClassComponent: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      if (flags & Update) {
        commitClassLayoutLifecycles(finishedWork, current);
      }

      if (flags & Callback) {
        commitClassCallbacks(finishedWork);
      }

      if (flags & Ref) {
        safelyAttachRef(finishedWork, finishedWork.return);
      }
      break;
    }
    case HostRoot: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      if (flags & Callback) {
        // TODO: I think this is now always non-null by the time it reaches the
        // commit phase. Consider removing the type check.
        const updateQueue: UpdateQueue<any, any> | null =
          (finishedWork.updateQueue as any);
        if (updateQueue !== null) {
          let instance: any = null;
          if (finishedWork.child !== null) {
            switch (finishedWork.child.tag) {
              case HostSingleton:
              case HostComponent:
                instance = getPublicInstance(finishedWork.child.stateNode);
                break;
              case ClassComponent:
                instance = finishedWork.child.stateNode;
                break;
            }
          }
          try {
            commitCallbacks(updateQueue, instance);
          } catch (error) {
            // captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
      }
      break;
    }
    case HostHoistable: {
      if (enableFloat && supportsResources) {
        recursivelyTraverseLayoutEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
        );

        if (flags & Ref) {
          safelyAttachRef(finishedWork, finishedWork.return);
        }
        break;
      }
      // Fall through
    }
    case HostSingleton:
    case HostComponent: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      // Renderers may schedule work to be done after host components are mounted
      // (eg DOM renderer may schedule auto-focus for inputs and form controls).
      // These effects should only be committed when components are first mounted,
      // aka when there is no current/alternate.
      if (current === null && flags & Update) {
        commitHostComponentMount(finishedWork);
      }

      if (flags & Ref) {
        safelyAttachRef(finishedWork, finishedWork.return);
      }
      break;
    }
    case Profiler: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      // TODO: Should this fire inside an offscreen tree? Or should it wait to
      // fire when the tree becomes visible again.
      if (flags & Update) {
        // commitProfilerUpdate(finishedWork, current);
      }
      break;
    }
    case SuspenseComponent: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      if (flags & Update) {
        // commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
      }
      break;
    }
    case OffscreenComponent: {
      const isModernRoot = (finishedWork.mode & ConcurrentMode) !== NoMode;
      if (isModernRoot) {
        const isHidden = finishedWork.memoizedState !== null;
        const newOffscreenSubtreeIsHidden =
          isHidden || offscreenSubtreeIsHidden;
        if (newOffscreenSubtreeIsHidden) {
          // The Offscreen tree is hidden. Skip over its layout effects.
        } else {
          // The Offscreen tree is visible.

          const wasHidden = current !== null && current.memoizedState !== null;
          const newOffscreenSubtreeWasHidden =
            wasHidden || offscreenSubtreeWasHidden;
          const prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden;
          const prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = newOffscreenSubtreeIsHidden;
          offscreenSubtreeWasHidden = newOffscreenSubtreeWasHidden;

          if (offscreenSubtreeWasHidden && !prevOffscreenSubtreeWasHidden) {
            // This is the root of a reappearing boundary. As we continue
            // traversing the layout effects, we must also re-mount layout
            // effects that were unmounted when the Offscreen subtree was
            // hidden. So this is a superset of the normal commitLayoutEffects.
            const includeWorkInProgressEffects =
              (finishedWork.subtreeFlags & LayoutMask) !== NoFlags;
            // recursivelyTraverseReappearLayoutEffects(
            //   finishedRoot,
            //   finishedWork,
            //   includeWorkInProgressEffects,
            // );
          } else {
            recursivelyTraverseLayoutEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
            );
          }
          offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        }
      } else {
        recursivelyTraverseLayoutEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
        );
      }
      if (flags & Ref) {
        const props: any = finishedWork.memoizedProps;
        if (props.mode === 'manual') {
          // 添加ref
          safelyAttachRef(finishedWork, finishedWork.return);
        } else {
          // 删除ref
          // safelyDetachRef(finishedWork, finishedWork.return);
        }
      }
      break;
    }
    default: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      break;
    }
  }
}


function recursivelyTraverseLayoutEffects(
  root,
  parentFiber: Fiber,
  lanes: Lanes,
) {
  if (parentFiber.subtreeFlags & LayoutMask) {
    let child = parentFiber.child;
    while (child !== null) {
      const current = child.alternate;
      commitLayoutEffectOnFiber(root, current, child, lanes);
      child = child.sibling;
    }
  }
}


function commitHookLayoutEffects(finishedWork: Fiber, hookFlags: HookFlags) {
  // At this point layout effects have already been destroyed (during mutation phase).
  // This is done to prevent sibling component effects from interfering with each other,
  // e.g. a destroy function in one component should never override a ref set
  // by a create function in another component during the same commit.
  if (shouldProfile(finishedWork)) {
    try {
      // startLayoutEffectTimer();
      commitHookEffectListMount(hookFlags, finishedWork);
    } catch (error) {
      // captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
    // recordLayoutEffectDuration(finishedWork);
  } else {
    try {
      commitHookEffectListMount(hookFlags, finishedWork);
    } catch (error) {
      // captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}


function commitHookEffectListMount(flags: HookFlags, finishedWork: Fiber) {
  const updateQueue: FunctionComponentUpdateQueue | null =
    (finishedWork.updateQueue as any);
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      // 前面有HookHasEffect时，这里的flags才会相等
      if ((effect.tag & flags) === flags) {
        if (enableSchedulingProfiler) {
          if ((flags & HookPassive) !== NoHookEffect) {
            // markComponentPassiveEffectMountStarted(finishedWork);
          } else if ((flags & HookLayout) !== NoHookEffect) {
            // markComponentLayoutEffectMountStarted(finishedWork);
          }
        }

        // Mount
        const create = effect.create;
        const inst = effect.inst;
        const destroy = create();
        inst.destroy = destroy;

        if (enableSchedulingProfiler) {
          if ((flags & HookPassive) !== NoHookEffect) {
            // markComponentPassiveEffectMountStopped();
          } else if ((flags & HookLayout) !== NoHookEffect) {
            // markComponentLayoutEffectMountStopped();
          }
        }

      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

export function commitPassiveUnmountEffects(finishedWork: Fiber): void {
  // setCurrentDebugFiberInDEV(finishedWork);
  commitPassiveUnmountOnFiber(finishedWork);
  // resetCurrentDebugFiberInDEV();
}

function commitPassiveUnmountOnFiber(finishedWork: Fiber): void {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {

      recursivelyTraversePassiveUnmountEffects(finishedWork);
      if (finishedWork.flags & Passive) {
        commitHookPassiveUnmountEffects(
          finishedWork,
          finishedWork.return,
          HookPassive | HookHasEffect,
        );
      }
      break;
    }
    case OffscreenComponent: {
      const instance: any = finishedWork.stateNode;
      const nextState: any | null = finishedWork.memoizedState;

      const isHidden = nextState !== null;

      if (
        isHidden &&
        instance._visibility & OffscreenPassiveEffectsConnected &&
        // For backwards compatibility, don't unmount when a tree suspends. In
        // the future we may change this to unmount after a delay.
        (finishedWork.return === null ||
          finishedWork.return.tag !== SuspenseComponent)
      ) {
        // The effects are currently connected. Disconnect them.
        // TODO: Add option or heuristic to delay before disconnecting the
        // effects. Then if the tree reappears before the delay has elapsed, we
        // can skip toggling the effects entirely.
        instance._visibility &= ~OffscreenPassiveEffectsConnected;
        // recursivelyTraverseDisconnectPassiveEffects(finishedWork);
      } else {
        recursivelyTraversePassiveUnmountEffects(finishedWork);
      }

      break;
    }
    default: {
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    }
  }
}

function commitHookEffectListUnmount(
  flags: HookFlags,
  finishedWork: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  const updateQueue: FunctionComponentUpdateQueue | null =
    (finishedWork.updateQueue as any);
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        // Unmount
        const inst = effect.inst;
        const destroy = inst.destroy;
        if (destroy !== undefined) {
          inst.destroy = undefined;
          if (enableSchedulingProfiler) {
            if ((flags & HookPassive) !== NoHookEffect) {
              // markComponentPassiveEffectUnmountStarted(finishedWork);
            } else if ((flags & HookLayout) !== NoHookEffect) {
              // markComponentLayoutEffectUnmountStarted(finishedWork);
            }
          }

          safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy);

          if (enableSchedulingProfiler) {
            if ((flags & HookPassive) !== NoHookEffect) {
              // markComponentPassiveEffectUnmountStopped();
            } else if ((flags & HookLayout) !== NoHookEffect) {
              // markComponentLayoutEffectUnmountStopped();
            }
          }
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

function commitHookPassiveUnmountEffects(
  finishedWork: Fiber,
  nearestMountedAncestor: null | Fiber,
  hookFlags: HookFlags,
) {
  if (shouldProfile(finishedWork)) {
    // startPassiveEffectTimer();
    commitHookEffectListUnmount(
      hookFlags,
      finishedWork,
      nearestMountedAncestor,
    );
    // recordPassiveEffectDuration(finishedWork);
  } else {
    commitHookEffectListUnmount(
      hookFlags,
      finishedWork,
      nearestMountedAncestor,
    );
  }
}

function commitPassiveUnmountInsideDeletedTreeOnFiber(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
): void {
  switch (current.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      commitHookPassiveUnmountEffects(
        current,
        nearestMountedAncestor,
        HookPassive,
      );
      break;
    }
    // TODO: run passive unmount effects when unmounting a root.
    // Because passive unmount effects are not currently run,
    // the cache instance owned by the root will never be freed.
    // When effects are run, the cache should be freed here:
    // case HostRoot: {
    //   if (enableCache) {
    //     const cache = current.memoizedState.cache;
    //     releaseCache(cache);
    //   }
    //   break;
    // }
    // case LegacyHiddenComponent:
    // case OffscreenComponent: {
    //   if (enableCache) {
    //     if (
    //       current.memoizedState !== null &&
    //       current.memoizedState.cachePool !== null
    //     ) {
    //       const cache: Cache = current.memoizedState.cachePool.pool;
    //       // Retain/release the cache used for pending (suspended) nodes.
    //       // Note that this is only reached in the non-suspended/visible case:
    //       // when the content is suspended/hidden, the retain/release occurs
    //       // via the parent Suspense component (see case above).
    //       if (cache != null) {
    //         retainCache(cache);
    //       }
    //     }
    //   }
    //   break;
    // }
    // case SuspenseComponent: {
    //   if (enableTransitionTracing) {
    //     // We need to mark this fiber's parents as deleted
    //     const offscreenFiber: Fiber = (current.child: any);
    //     const instance: OffscreenInstance = offscreenFiber.stateNode;
    //     const transitions = instance._transitions;
    //     if (transitions !== null) {
    //       const abortReason = {
    //         reason: 'suspense',
    //         name: current.memoizedProps.unstable_name || null,
    //       };
    //       if (
    //         current.memoizedState === null ||
    //         current.memoizedState.dehydrated === null
    //       ) {
    //         abortParentMarkerTransitionsForDeletedFiber(
    //           offscreenFiber,
    //           abortReason,
    //           transitions,
    //           instance,
    //           true,
    //         );

    //         if (nearestMountedAncestor !== null) {
    //           abortParentMarkerTransitionsForDeletedFiber(
    //             nearestMountedAncestor,
    //             abortReason,
    //             transitions,
    //             instance,
    //             false,
    //           );
    //         }
    //       }
    //     }
    //   }
    //   break;
    // }
    // case CacheComponent: {
    //   if (enableCache) {
    //     const cache = current.memoizedState.cache;
    //     releaseCache(cache);
    //   }
    //   break;
    // }
    // case TracingMarkerComponent: {
    //   if (enableTransitionTracing) {
    //     // We need to mark this fiber's parents as deleted
    //     const instance = current.stateNode;
    //     const transitions = instance.transitions;
    //     if (transitions !== null) {
    //       const abortReason = {
    //         reason: 'marker',
    //         name: current.memoizedProps.name,
    //       };
    //       abortParentMarkerTransitionsForDeletedFiber(
    //         current,
    //         abortReason,
    //         transitions,
    //         null,
    //         true,
    //       );

    //       if (nearestMountedAncestor !== null) {
    //         abortParentMarkerTransitionsForDeletedFiber(
    //           nearestMountedAncestor,
    //           abortReason,
    //           transitions,
    //           null,
    //           false,
    //         );
    //       }
    //     }
    //   }
    //   break;
    // }
  }
}

/**
 * 提交阶段，如果子组件被删除了，需要递归卸载副作用
 * @param deletedSubtreeRoot 
 * @param nearestMountedAncestor 
 */
function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
  deletedSubtreeRoot: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  while (nextEffect !== null) {
    const fiber = nextEffect;

    // Deletion effects fire in parent -> child order
    // TODO: Check if fiber has a PassiveStatic flag
    // setCurrentDebugFiberInDEV(fiber);
    commitPassiveUnmountInsideDeletedTreeOnFiber(fiber, nearestMountedAncestor);
    // resetCurrentDebugFiberInDEV();

    const child = fiber.child;
    // TODO: Only traverse subtree if it has a PassiveStatic flag.
    // 如果子树也有副作用标识的话，会递归遍历
    if (child !== null) {
      child.return = fiber;
      nextEffect = child;
    } else {
      commitPassiveUnmountEffectsInsideOfDeletedTree_complete(
        deletedSubtreeRoot,
      );
    }
  }
}

/**
 * 清空fiber属性
 * @param fiber 
 */
function detachFiberAfterEffects(fiber: Fiber) {
  const alternate = fiber.alternate;
  if (alternate !== null) {
    fiber.alternate = null;
    detachFiberAfterEffects(alternate);
  }

  // Clear cyclical Fiber fields. This level alone is designed to roughly
  // approximate the planned Fiber refactor. In that world, `setState` will be
  // bound to a special "instance" object instead of a Fiber. The Instance
  // object will not have any of these fields. It will only be connected to
  // the fiber tree via a single link at the root. So if this level alone is
  // sufficient to fix memory issues, that bodes well for our plans.
  fiber.child = null;
  fiber.deletions = null;
  fiber.sibling = null;

  // The `stateNode` is cyclical because on host nodes it points to the host
  // tree, which has its own pointers to children, parents, and siblings.
  // The other host nodes also point back to fibers, so we should detach that
  // one, too.
  if (fiber.tag === HostComponent) {
    const hostInstance: Instance = fiber.stateNode;
    if (hostInstance !== null) {
      detachDeletedInstance(hostInstance);
    }
  }
  fiber.stateNode = null;

  // Theoretically, nothing in here should be necessary, because we already
  // disconnected the fiber from the tree. So even if something leaks this
  // particular fiber, it won't leak anything else.
  fiber.return = null;
  fiber.dependencies = null;
  fiber.memoizedProps = null;
  fiber.memoizedState = null;
  fiber.pendingProps = null;
  fiber.stateNode = null;
  // TODO: Move to `commitPassiveUnmountInsideDeletedTreeOnFiber` instead.
  fiber.updateQueue = null;
}

function commitPassiveUnmountEffectsInsideOfDeletedTree_complete(
  deletedSubtreeRoot: Fiber,
) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    const sibling = fiber.sibling;
    const returnFiber = fiber.return;

    // Recursively traverse the entire deleted tree and clean up fiber fields.
    // This is more aggressive than ideal, and the long term goal is to only
    // have to detach the deleted tree at the root.
    detachFiberAfterEffects(fiber);
    if (fiber === deletedSubtreeRoot) {
      nextEffect = null;
      return;
    }

    if (sibling !== null) {
      sibling.return = returnFiber;
      nextEffect = sibling;
      return;
    }

    nextEffect = returnFiber;
  }
}

function recursivelyTraversePassiveUnmountEffects(parentFiber: Fiber): void {
  // Deletions effects can be scheduled on any fiber type. They need to happen
  // before the children effects have fired.
  const deletions = parentFiber.deletions;

  if ((parentFiber.flags & ChildDeletion) !== NoFlags) {
    if (deletions !== null) {
      for (let i = 0; i < deletions.length; i++) {
        const childToDelete = deletions[i];
        // TODO: Convert this to use recursion
        nextEffect = childToDelete;
        commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
          childToDelete,
          parentFiber,
        );
      }
    }
    // detachAlternateSiblings(parentFiber);
  }

  // const prevDebugFiber = getCurrentDebugFiberInDEV();
  // TODO: Split PassiveMask into separate masks for mount and unmount?
  if (parentFiber.subtreeFlags & PassiveMask) {
    let child = parentFiber.child;
    while (child !== null) {
      // setCurrentDebugFiberInDEV(child);
      commitPassiveUnmountOnFiber(child);
      child = child.sibling;
    }
  }
  // setCurrentDebugFiberInDEV(prevDebugFiber);
}

export function commitPassiveMountEffects(
  root: any,
  finishedWork: Fiber,
  committedLanes: Lanes,
  committedTransitions: Array<any> | null,
): void {
  // setCurrentDebugFiberInDEV(finishedWork);
  commitPassiveMountOnFiber(
    root,
    finishedWork,
    committedLanes,
    committedTransitions,
  );
  // resetCurrentDebugFiberInDEV();
}

/**
 * 递归遍历副作用
 */
function recursivelyTraversePassiveMountEffects(
  root: any,
  parentFiber: Fiber,
  committedLanes: Lanes,
  committedTransitions: Array<any> | null,
) {
  // const prevDebugFiber = getCurrentDebugFiberInDEV();
  // 如果子节点有副作用
  if (parentFiber.subtreeFlags & PassiveMask) {
    let child = parentFiber.child;
    while (child !== null) {
      // setCurrentDebugFiberInDEV(child);
      commitPassiveMountOnFiber(
        root,
        child,
        committedLanes,
        committedTransitions,
      );
      child = child.sibling;
    }
  }
  // setCurrentDebugFiberInDEV(prevDebugFiber);
}

function commitHookPassiveMountEffects(
  finishedWork: Fiber,
  hookFlags: HookFlags,
) {
  if (shouldProfile(finishedWork)) {
    // startPassiveEffectTimer();
    try {
      commitHookEffectListMount(hookFlags, finishedWork);
    } catch (error) {
      // captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
    // recordPassiveEffectDuration(finishedWork);
  } else {
    try {
      commitHookEffectListMount(hookFlags, finishedWork);
    } catch (error) {
      // captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}

function commitPassiveMountOnFiber(
  finishedRoot: any,
  finishedWork: Fiber,
  committedLanes: Lanes,
  committedTransitions: Array<any> | null,
): void {
  // When updating this function, also update reconnectPassiveEffects, which does
  // most of the same things when an offscreen tree goes from hidden -> visible,
  // or when toggling effects inside a hidden tree.
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
      );
      if (flags & Passive) {
        commitHookPassiveMountEffects(
          finishedWork,
          HookPassive | HookHasEffect,
        );
      }
      break;
    }
    case HostRoot: {
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
      );
      if (flags & Passive) {
        if (enableCache) {
          let previousCache: Cache | null = null;
          if (finishedWork.alternate !== null) {
            previousCache = finishedWork.alternate.memoizedState.cache;
          }
          const nextCache = finishedWork.memoizedState.cache;
          // Retain/release the root cache.
          // Note that on initial mount, previousCache and nextCache will be the same
          // and this retain won't occur. To counter this, we instead retain the HostRoot's
          // initial cache when creating the root itself (see createFiberRoot() in
          // ReactFiberRoot.js). Subsequent updates that change the cache are reflected
          // here, such that previous/next caches are retained correctly.
          if (nextCache !== previousCache) {
            retainCache(nextCache);
            if (previousCache != null) {
              releaseCache(previousCache);
            }
          }
        }

        if (enableTransitionTracing) {
          // Get the transitions that were initiatized during the render
          // and add a start transition callback for each of them
          const root: FiberRoot = finishedWork.stateNode;
          const incompleteTransitions = root.incompleteTransitions;
          // Initial render
          if (committedTransitions !== null) {
            committedTransitions.forEach(transition => {
              addTransitionStartCallbackToPendingTransition(transition);
            });

            clearTransitionsForLanes(finishedRoot, committedLanes);
          }

          incompleteTransitions.forEach((markerInstance, transition) => {
            const pendingBoundaries = markerInstance.pendingBoundaries;
            if (pendingBoundaries === null || pendingBoundaries.size === 0) {
              if (markerInstance.aborts === null) {
                addTransitionCompleteCallbackToPendingTransition(transition);
              }
              incompleteTransitions.delete(transition);
            }
          });

          clearTransitionsForLanes(finishedRoot, committedLanes);
        }
      }
      break;
    }
    case LegacyHiddenComponent: {
      if (enableLegacyHidden) {
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
        );

        if (flags & Passive) {
          const current = finishedWork.alternate;
          const instance: OffscreenInstance = finishedWork.stateNode;
          commitOffscreenPassiveMountEffects(current, finishedWork, instance);
        }
      }
      break;
    }
    // case OffscreenComponent: {
    //   // TODO: Pass `current` as argument to this function
    //   const instance: OffscreenInstance = finishedWork.stateNode;
    //   const nextState: OffscreenState | null = finishedWork.memoizedState;

    //   const isHidden = nextState !== null;

    //   if (isHidden) {
    //     if (instance._visibility & OffscreenPassiveEffectsConnected) {
    //       // The effects are currently connected. Update them.
    //       recursivelyTraversePassiveMountEffects(
    //         finishedRoot,
    //         finishedWork,
    //         committedLanes,
    //         committedTransitions,
    //       );
    //     } else {
    //       if (finishedWork.mode & ConcurrentMode) {
    //         // The effects are currently disconnected. Since the tree is hidden,
    //         // don't connect them. This also applies to the initial render.
    //         if (enableCache || enableTransitionTracing) {
    //           // "Atomic" effects are ones that need to fire on every commit,
    //           // even during pre-rendering. An example is updating the reference
    //           // count on cache instances.
    //           recursivelyTraverseAtomicPassiveEffects(
    //             finishedRoot,
    //             finishedWork,
    //             committedLanes,
    //             committedTransitions,
    //           );
    //         }
    //       } else {
    //         // Legacy Mode: Fire the effects even if the tree is hidden.
    //         instance._visibility |= OffscreenPassiveEffectsConnected;
    //         recursivelyTraversePassiveMountEffects(
    //           finishedRoot,
    //           finishedWork,
    //           committedLanes,
    //           committedTransitions,
    //         );
    //       }
    //     }
    //   } else {
    //     // Tree is visible
    //     if (instance._visibility & OffscreenPassiveEffectsConnected) {
    //       // The effects are currently connected. Update them.
    //       recursivelyTraversePassiveMountEffects(
    //         finishedRoot,
    //         finishedWork,
    //         committedLanes,
    //         committedTransitions,
    //       );
    //     } else {
    //       // The effects are currently disconnected. Reconnect them, while also
    //       // firing effects inside newly mounted trees. This also applies to
    //       // the initial render.
    //       instance._visibility |= OffscreenPassiveEffectsConnected;

    //       const includeWorkInProgressEffects =
    //         (finishedWork.subtreeFlags & PassiveMask) !== NoFlags;
    //       recursivelyTraverseReconnectPassiveEffects(
    //         finishedRoot,
    //         finishedWork,
    //         committedLanes,
    //         committedTransitions,
    //         includeWorkInProgressEffects,
    //       );
    //     }
    //   }

    //   if (flags & Passive) {
    //     const current = finishedWork.alternate;
    //     // commitOffscreenPassiveMountEffects(current, finishedWork, instance);
    //   }
    //   break;
    // }
    case CacheComponent: {
      // recursivelyTraversePassiveMountEffects(
      //   finishedRoot,
      //   finishedWork,
      //   committedLanes,
      //   committedTransitions,
      // );
      if (flags & Passive) {
        // TODO: Pass `current` as argument to this function
        const current = finishedWork.alternate;
        // commitCachePassiveMountEffect(current, finishedWork);
      }
      break;
    }
    case TracingMarkerComponent: {
      // if (enableTransitionTracing) {
      //   recursivelyTraversePassiveMountEffects(
      //     finishedRoot,
      //     finishedWork,
      //     committedLanes,
      //     committedTransitions,
      //   );
      //   if (flags & Passive) {
      //     // commitTracingMarkerPassiveMountEffect(finishedWork);
      //   }
      //   break;
      // }
      // Intentional fallthrough to next branch
    }
    default: {
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
      );
      break;
    }
  }
}
