import { StartTransitionOptions } from "shared/ReactTypes";
import { Lanes } from "./ReactFiberLane";
import { WorkTag } from "./ReactWorkTags";

type ReactContext<T> = any

export type HookType =
  | 'useState'
  | 'useReducer'
  | 'useContext'
  | 'useRef'
  | 'useEffect'
  | 'useEffectEvent'
  | 'useInsertionEffect'
  | 'useLayoutEffect'
  | 'useCallback'
  | 'useMemo'
  | 'useImperativeHandle'
  | 'useDebugValue'
  | 'useDeferredValue'
  | 'useTransition'
  | 'useSyncExternalStore'
  | 'useId'
  | 'useCacheRefresh'
  | 'useOptimistic'
  | 'useFormState';

export type ContextDependency<T> = {
  context: ReactContext<T>,
  next: ContextDependency<any> | null,
  memoizedValue: T,
};

export type Dependencies = {
  lanes: Lanes,
  firstContext: ContextDependency<any> | null,
};

export type Fiber = {
  // These first fields are conceptually members of an Instance. This used to
  // be split into a separate type and intersected with the other Fiber fields,
  // but until Flow fixes its intersection bugs, we've merged them into a
  // single type.

  // An Instance is shared between all versions of a component. We can easily
  // break this out into a separate object to avoid copying so much to the
  // alternate versions of the tree. We put this on a single object for now to
  // minimize the number of objects created during the initial render.

  // Tag identifying the type of fiber.
  tag: WorkTag,

  // Unique identifier of this child.
  key: null | string,

  // The value of element.type which is used to preserve the identity during
  // reconciliation of this child.
  elementType: any,

  // The resolved function/class/ associated with this fiber.
  type: any,

  // The local state associated with this fiber.
  stateNode: any,

  // Conceptual aliases
  // parent : Instance -> return The parent happens to be the same as the
  // return fiber since we've merged the fiber and instance.

  // Remaining fields belong to Fiber

  // The Fiber to return to after finishing processing this one.
  // This is effectively the parent, but there can be multiple parents (two)
  // so this is only the parent of the thing we're currently processing.
  // It is conceptually the same as the return address of a stack frame.
  return: Fiber | null,

  // Singly Linked List Tree Structure.
  child: Fiber | null,
  sibling: Fiber | null,
  index: number,

  // The ref last used to attach this node.
  // I'll avoid adding an owner field for prod and model that as functions.
  ref:
    | null
    | ((handle: any) => void)

  refCleanup: null | (() => void),

  // Input is the data coming into process this fiber. Arguments. Props.
  pendingProps: any, // This type will be more specific once we overload the tag.
  memoizedProps: any, // The props used to create the output.

  // A queue of state updates and callbacks.
  updateQueue: any,

  // The state used to create the output
  memoizedState: any,

  // Dependencies (contexts, events) for this fiber, if it has any
  dependencies: Dependencies | null,

  // Bitfield that describes properties about the fiber and its subtree. E.g.
  // the ConcurrentMode flag indicates whether the subtree should be async-by-
  // default. When a fiber is created, it inherits the mode of its
  // parent. Additional flags can be set at creation time, but after that the
  // value should remain unchanged throughout the fiber's lifetime, particularly
  // before its child fibers are created.
  mode: any,

  // Effect
  flags: any,
  subtreeFlags: any,
  deletions: Array<Fiber> | null,

  // Singly linked list fast path to the next fiber with side-effects.
  nextEffect: Fiber | null,

  // The first and last fiber with side-effect within this subtree. This allows
  // us to reuse a slice of the linked list when we reuse the work done within
  // this fiber.
  firstEffect: Fiber | null,
  lastEffect: Fiber | null,

  lanes: Lanes,
  childLanes: Lanes,

  // This is a pooled version of a Fiber. Every fiber that gets updated will
  // eventually have a pair. There are cases when we can clean up pairs to save
  // memory if we need to.
  alternate: Fiber | null,

  // Time spent rendering this Fiber and its descendants for the current update.
  // This tells us how well the tree makes use of sCU for memoization.
  // It is reset to 0 each time we render and only updated when we don't bailout.
  // This field is only set when the enableProfilerTimer flag is enabled.
  actualDuration?: number,

  // If the Fiber is currently active in the "render" phase,
  // This marks the time at which the work began.
  // This field is only set when the enableProfilerTimer flag is enabled.
  actualStartTime?: number,

  // Duration of the most recent render time for this Fiber.
  // This value is not updated when we bailout for memoization purposes.
  // This field is only set when the enableProfilerTimer flag is enabled.
  selfBaseDuration?: number,

  // Sum of base times for all descendants of this Fiber.
  // This value bubbles up during the "complete" phase.
  // This field is only set when the enableProfilerTimer flag is enabled.
  treeBaseDuration?: number,

  // Conceptual aliases
  // workInProgress : Fiber ->  alternate The alternate used for reuse happens
  // to be the same as work in progress.
  // __DEV__ only

  _debugSource?: any,
  _debugOwner?: Fiber | null,
  _debugIsCurrentlyTiming?: boolean,
  _debugNeedsRemount?: boolean,

  // Used to verify that the order of hooks does not change between renders.
  _debugHookTypes?: Array<HookType> | null,
};

type BasicStateAction<S> = ((S) => S) | S;
type Dispatch<A> = (A) => void;

export type MemoCache = {
  data: Array<Array<any>>,
  index: number,
};

export type Dispatcher = {
  use?: <T>(Usable) => T,
  readContext?<T>(context: ReactContext<T>): T,
  useState?<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>],
  useReducer?<S, I, A>(
    reducer: (S, A) => S,
    initialArg: I,
    init?: (I) => S,
  ): [S, Dispatch<A>],
  useContext?<T>(context: ReactContext<T>): T,
  useRef?<T>(initialValue?: T): {current: T},
  useEffect?(
    create: () => (() => void) | void,
    deps: Array<any> | void | null,
  ): void,
  useEffectEvent?: <Args, F>(callback: F) => F,
  useInsertionEffect?(
    create: () => (() => void) | void,
    deps: Array<any> | void | null,
  ): void,
  useLayoutEffect?(
    create: () => (() => void) | void,
    deps: Array<any> | void | null,
  ): void,
  useCallback?<T>(callback: T, deps: Array<any> | void | null): T,
  useMemo?<T>(nextCreate: () => T, deps: Array<any> | void | null): T,
  useImperativeHandle?<T>(
    ref: {current: T | null} | ((inst: T | null) => any) | null | void,
    create: () => T,
    deps: Array<any> | void | null,
  ): void,
  // useDebugValue<T>(value: T, formatterFn: ?(value: T) => any): void,
  useDeferredValue?<T>(value: T, initialValue?: T): T,
  useTransition?(): [
    boolean,
    (callback: () => void, options?: StartTransitionOptions) => void,
  ],
  // useSyncExternalStore<T>(
  //   subscribe: (() => void) => () => void,
  //   getSnapshot: () => T,
  //   getServerSnapshot?: () => T,
  // ): T,
  useId?(): string,
  // useCacheRefresh?: () => <T>(() => T, T) => void,
  useMemoCache?: (size: number) => Array<any>,
  // useHostTransitionStatus?: () => TransitionStatus,
  // useOptimistic?: <S, A>(
  //   passthrough: S,
  //   reducer: ?(S, A) => S,
  // ) => [S, (A) => void],
  // useFormState?: <S, P>(
  //   action: (Awaited<S>, P) => S,
  //   initialState: Awaited<S>,
  //   permalink?: string,
  // ) => [Awaited<S>, (P) => void],
} | null;