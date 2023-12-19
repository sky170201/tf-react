import { Container } from "index";
import { Fiber } from "react-reconciler/src/ReactInternalTypes";
import { Instance, Props, TextInstance } from "./ReactFiberConfigDOM";

const randomKey = Math.random().toString(36).slice(2);
const internalInstanceKey = '__reactFiber$' + randomKey;
const internalPropsKey = '__reactProps$' + randomKey;
const internalContainerInstanceKey = '__reactContainer$' + randomKey;
const internalEventHandlersKey = '__reactEvents$' + randomKey;
const internalEventHandlerListenersKey = '__reactListeners$' + randomKey;
const internalEventHandlesSetKey = '__reactHandles$' + randomKey;


export function markContainerAsRoot(hostRoot: Fiber, node: Container): void {
  // $FlowFixMe[prop-missing]
  node && (node[internalContainerInstanceKey] = hostRoot);
}

export function updateFiberProps(
  node: Instance | TextInstance,
  props: Props,
): void {
  node[internalPropsKey] = props;
}

export function detachDeletedInstance(node: Instance): void {
  // TODO: This function is only called on host components. I don't think all of
  // these fields are relevant.
  delete node[internalInstanceKey];
  delete node[internalPropsKey];
  delete node[internalEventHandlersKey];
  delete node[internalEventHandlerListenersKey];
  delete node[internalEventHandlesSetKey];
}

export function getEventHandlerListeners(
  scope: any,
): null | Set<any> {
  return (scope as any)[internalEventHandlerListenersKey] || null;
}

export function getFiberCurrentPropsFromNode(
  node: any,
): Props {
  return (node as any)[internalPropsKey] || null;
}

export function precacheFiberNode(
  hostInst: Fiber,
  node: any,
): void {
  (node as any)[internalInstanceKey] = hostInst;
}

export function getClosestInstanceFromNode(targetNode: Node) {
  let targetInst = (targetNode as any)[internalInstanceKey];
  if (targetInst) {
    // Don't return HostRoot or SuspenseComponent here.
    return targetInst;
  }
  return null
}