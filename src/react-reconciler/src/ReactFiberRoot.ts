import { RootTag } from "./ReactRootTags";
import {
  NoLane,
  NoLanes,
  NoTimestamp,
  TotalLanes,
  createLaneMap,
} from './ReactFiberLane';
import {createHostRootFiber} from './ReactFiber';
import {initializeUpdateQueue} from './ReactFiberClassUpdateQueue';
import { Container } from "index";


function FiberRootNode(
  this,
  containerInfo: any,
  tag,
  hydrate: any,
  identifierPrefix: any,
  onRecoverableError: any,
  formState,
) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.current = null;
  this.pingCache = null;
  this.finishedWork = null;
  this.timeoutHandle = null;
  this.cancelPendingCommit = null;
  this.context = null;
  this.pendingContext = null;
  this.next = null;
  this.callbackNode = null;
  this.callbackPriority = NoLane;
  this.expirationTimes = createLaneMap(NoTimestamp);

  this.pendingLanes = NoLanes;
  this.suspendedLanes = NoLanes;
  this.pingedLanes = NoLanes;
  this.expiredLanes = NoLanes;
  this.finishedLanes = NoLanes;
  this.errorRecoveryDisabledLanes = NoLanes;
  this.shellSuspendCounter = 0;

  this.entangledLanes = NoLanes;
  this.entanglements = createLaneMap(NoLanes);

  this.hiddenUpdates = createLaneMap(null);

  this.identifierPrefix = identifierPrefix;
  this.onRecoverableError = onRecoverableError;

  this.formState = formState;

}

export function createFiberRoot(
  containerInfo: Container,
  tag: RootTag,
  hydrate: boolean,
  initialChildren,
  hydrationCallback,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
  // TODO: We have several of these arguments that are conceptually part of the
  // host config, but because they are passed in at runtime, we have to thread
  // them through the root constructor. Perhaps we should put them all into a
  // single type, like a DynamicHostConfig that is defined by the renderer.
  identifierPrefix: string,
  onRecoverableError: null | ((error: any) => void),
  transitionCallbacks,
  formState,
) {
  const root = new FiberRootNode(
    containerInfo,
    tag,
    hydrate,
    identifierPrefix,
    onRecoverableError,
    formState,
  );

  // Cyclic construction. This cheats the type system right now because
  // stateNode is any.
  const uninitializedFiber = createHostRootFiber(
    tag,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
  );
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  initializeUpdateQueue(uninitializedFiber);

  return root;
}