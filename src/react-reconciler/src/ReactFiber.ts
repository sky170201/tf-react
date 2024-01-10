import { RootTag } from "./ReactRootTags";
import type {Fiber} from './ReactInternalTypes';
import {ConcurrentRoot} from './ReactRootTags';
import {NoFlags, Placement, StaticMask} from './ReactFiberFlags';
import {
  NoMode,
  ConcurrentMode,
  StrictLegacyMode,
  StrictEffectsMode,
  ConcurrentUpdatesByDefaultMode,
  TypeOfMode,
} from './ReactTypeOfMode';
import {
  IndeterminateComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  HostHoistable,
  HostSingleton,
  ForwardRef,
  Fragment,
  Mode,
  ContextProvider,
  ContextConsumer,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  DehydratedFragment,
  FunctionComponent,
  MemoComponent,
  SimpleMemoComponent,
  LazyComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
  TracingMarkerComponent,
  WorkTag,
} from './ReactWorkTags';
import { Lanes, NoLanes } from "./ReactFiberLane";
import type {ReactFragment, ReactPortal, ReactScope} from 'shared/ReactTypes';
import { Source } from "shared/ReactElementType";
import {
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_DEBUG_TRACING_MODE_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_PROVIDER_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_MEMO_TYPE,
  REACT_LAZY_TYPE,
  REACT_SCOPE_TYPE,
  REACT_OFFSCREEN_TYPE,
  REACT_LEGACY_HIDDEN_TYPE,
  REACT_CACHE_TYPE,
  REACT_TRACING_MARKER_TYPE,
} from 'shared/ReactSymbols';

export function createHostRootFiber(
  tag: RootTag,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
): Fiber {
  let mode;
  if (tag === ConcurrentRoot) {
    // 并发模式赋值
    mode = ConcurrentMode;
    if (isStrictMode === true) {
      mode |= StrictLegacyMode | StrictEffectsMode;
    }
  } else {
    mode = NoMode;
  }

  return createFiber(HostRoot, null, null, mode);
}


function FiberNode(
  this,
  tag: WorkTag,
  pendingProps: any,
  key: null | string,
  mode: TypeOfMode,
) {
  // Instance
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  this.stateNode = null;

  // Fiber
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.ref = null;
  this.refCleanup = null;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  this.dependencies = null;

  this.mode = mode;

  // Effects
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  this.lanes = NoLanes;
  this.childLanes = NoLanes;

  this.alternate = null;
}

function createFiber(
  tag: WorkTag,
  pendingProps,
  key: null | string,
  mode: TypeOfMode,
): Fiber {
  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  return new FiberNode(tag, pendingProps, key, mode);
}

// This is used to create an alternate fiber to do work on.
export function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode,
    );
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;


    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    // Needed because Blocks store data on type.
    workInProgress.type = current.type;

    // We already have an alternate.
    // Reset the effect tag.
    workInProgress.flags = NoFlags;

    // The effects are no longer valid.
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;

    // if (enableProfilerTimer) {
    //   // We intentionally reset, rather than copy, actualDuration & actualStartTime.
    //   // This prevents time from endlessly accumulating in new commits.
    //   // This has the downside of resetting values for different priority renders,
    //   // But works for yielding (the common case) and should support resuming.
    //   workInProgress.actualDuration = 0;
    //   workInProgress.actualStartTime = -1;
    // }
  }

  // Reset all effects except static ones.
  // Static effects are not specific to a render.
  workInProgress.flags = current.flags & StaticMask;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  // Clone the dependencies object. This is mutated during the render phase, so
  // it cannot be shared with the current fiber.
  const currentDependencies = current.dependencies;
  workInProgress.dependencies =
    currentDependencies === null
      ? null
      : {
          lanes: currentDependencies.lanes,
          firstContext: currentDependencies.firstContext,
        };

  // These will be overridden during the parent's reconciliation
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;
  workInProgress.refCleanup = current.refCleanup;

  // if (enableProfilerTimer) {
  //   workInProgress.selfBaseDuration = current.selfBaseDuration;
  //   workInProgress.treeBaseDuration = current.treeBaseDuration;
  // }

  return workInProgress;
}

/**
 * 创建文本节点 tag = 6
 */
export function createFiberFromText(
  content: string,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  const fiber = createFiber(HostText, content, null, mode);
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromFragment(
  elements: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  const fiber = createFiber(Fragment, elements, key, mode);
  fiber.lanes = lanes;
  return fiber;
}

/**
 * 创建元素fiber节点
 */
export function createFiberFromElement(
  element: any,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  let source = null;
  let owner = null;
  const type = element.type;
  const key = element.key;
  const pendingProps = element.props;
  const fiber = createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    source,
    owner,
    mode,
    lanes,
  );
  return fiber;
}

function shouldConstruct(Component: Function) {
  const prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}

export function createFiberFromTypeAndProps(
  type: any, // React$ElementType
  key: null | string,
  pendingProps: any,
  source: any,
  owner: null | Fiber,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  // 创建fiber时，tag不确定是什么，先赋值为IndeterminateComponent
  let fiberTag = IndeterminateComponent;
  // The resolved type is set if we know what the final type will be. I.e. it's not lazy.
  let resolvedType = type;
  if (typeof type === 'function') {
    if (shouldConstruct(type)) {
      fiberTag = ClassComponent;
    } else {
    }
  } else if (typeof type === 'string') { // 元素类型 => div
    // if (enableFloat && supportsResources && supportsSingletons) {
    //   const hostContext = getHostContext();
    //   fiberTag = isHostHoistableType(type, pendingProps, hostContext)
    //     ? HostHoistable
    //     : isHostSingletonType(type)
    //     ? HostSingleton
    //     : HostComponent;
    // } else if (enableFloat && supportsResources) {
    //   const hostContext = getHostContext();
    //   fiberTag = isHostHoistableType(type, pendingProps, hostContext)
    //     ? HostHoistable
    //     : HostComponent;
    // } else if (supportsSingletons) {
    //   fiberTag = isHostSingletonType(type) ? HostSingleton : HostComponent;
    // } else {
      fiberTag = HostComponent;
    // }
  } else {
    getTag: switch (type) {
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(pendingProps.children, mode, lanes, key);
      case REACT_STRICT_MODE_TYPE:
        fiberTag = Mode;
        mode |= StrictLegacyMode;
        if ((mode & ConcurrentMode) !== NoMode) {
          // Strict effects should never run on legacy roots
          mode |= StrictEffectsMode;
          // if (
          //   enableDO_NOT_USE_disableStrictPassiveEffect &&
          //   pendingProps.DO_NOT_USE_disableStrictPassiveEffect
          // ) {
          //   mode |= NoStrictPassiveEffectsMode;
          // }
        }
        break;
      // case REACT_PROFILER_TYPE:
      //   return createFiberFromProfiler(pendingProps, mode, lanes, key);
      // case REACT_SUSPENSE_TYPE:
      //   return createFiberFromSuspense(pendingProps, mode, lanes, key);
      // case REACT_SUSPENSE_LIST_TYPE:
      //   return createFiberFromSuspenseList(pendingProps, mode, lanes, key);
      // case REACT_OFFSCREEN_TYPE:
      //   return createFiberFromOffscreen(pendingProps, mode, lanes, key);
      // case REACT_LEGACY_HIDDEN_TYPE:
      //   if (enableLegacyHidden) {
      //     return createFiberFromLegacyHidden(pendingProps, mode, lanes, key);
      //   }
      // // Fall through
      // case REACT_SCOPE_TYPE:
      //   if (enableScopeAPI) {
      //     return createFiberFromScope(type, pendingProps, mode, lanes, key);
      //   }
      // // Fall through
      // case REACT_CACHE_TYPE:
      //   if (enableCache) {
      //     return createFiberFromCache(pendingProps, mode, lanes, key);
      //   }
      // // Fall through
      // case REACT_TRACING_MARKER_TYPE:
      //   if (enableTransitionTracing) {
      //     return createFiberFromTracingMarker(pendingProps, mode, lanes, key);
      //   }
      // // Fall through
      // case REACT_DEBUG_TRACING_MODE_TYPE:
      //   if (enableDebugTracing) {
      //     fiberTag = Mode;
      //     mode |= DebugTracingMode;
      //     break;
      //   }
      // Fall through
      default: {
        if (typeof type === 'object' && type !== null) {
          switch (type.$$typeof) {
            case REACT_PROVIDER_TYPE:
              fiberTag = ContextProvider;
              break getTag;
            case REACT_CONTEXT_TYPE:
              // This is a consumer
              fiberTag = ContextConsumer;
              break getTag;
            case REACT_FORWARD_REF_TYPE:
              fiberTag = ForwardRef;
              break getTag;
            case REACT_MEMO_TYPE:
              fiberTag = MemoComponent;
              break getTag;
            case REACT_LAZY_TYPE:
              fiberTag = LazyComponent;
              resolvedType = null;
              break getTag;
          }
        }
      }
    }
  }
  // 根据$$typeof确认tag
  const fiber = createFiber(fiberTag, pendingProps, key, mode);
  fiber.elementType = type;
  fiber.type = resolvedType;
  fiber.lanes = lanes;

  return fiber;
}

export function isSimpleFunctionComponent(type: any): boolean {
  return (
    typeof type === 'function' &&
    !shouldConstruct(type) &&
    type.defaultProps === undefined
  );
}
