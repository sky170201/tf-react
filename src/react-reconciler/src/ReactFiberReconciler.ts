import { RootTag } from "./ReactRootTags";
import {createFiberRoot} from './ReactFiberRoot';
import { Lane, NoLane } from "./ReactFiberLane";
import { enableSchedulingProfiler } from "shared/ReactFeatureFlags";
import {
  createUpdate,
  enqueueUpdate,
} from './ReactFiberClassUpdateQueue';
import { requestUpdateLane, scheduleUpdateOnFiber } from './ReactFiberWorkLoop'
import { Container } from "index";


export function createContainer(
  containerInfo: Container,
  tag: RootTag,
  hydrationCallbacks,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
  identifierPrefix: string,
  onRecoverableError,
  transitionCallbacks,
) {
  const hydrate = false;
  const initialChildren = null;
  return createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    initialChildren,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks,
    null,
  );
}


export function updateContainer(
  element,
  container,
  parentComponent,
  callback,
): Lane {
  const current = container.current;
  // 请求更新赛道，默认是32
  const lane = requestUpdateLane(current);
  // const lane = NoLane;

  if (enableSchedulingProfiler) {
    // markRenderScheduled(lane);
  }

  // const context = getContextForSubtree(parentComponent);
  const context = null;
  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  const update: any = createUpdate(lane);
  // Caution: React DevTools currently depends on this property
  // being called "element".
  update.payload = {element};

  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    update.callback = callback;
  }

  const root = enqueueUpdate(current, update, lane);
  if (root !== null) {
    scheduleUpdateOnFiber(root, current, lane);
    // entangleTransitions(root, current, lane);
  }

  return lane;
}