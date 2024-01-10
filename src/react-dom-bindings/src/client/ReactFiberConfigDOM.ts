import { Container } from 'index';
import {
  setInitialProperties,
  diffProperties,
  updateProperties,
  // updateProperties,
  // diffHydratedProperties,
  // diffHydratedText,
  // trapClickOnNonInteractiveElement,
  // checkForUnmatchedText,
  // warnForDeletedHydratableElement,
  // warnForDeletedHydratableText,
  // warnForInsertedHydratedElement,
  // warnForInsertedHydratedText,
} from './ReactDOMComponent';
import setTextContent from './setTextContent';
import {
  ELEMENT_NODE,
  TEXT_NODE,
  COMMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_TYPE_NODE,
  DOCUMENT_FRAGMENT_NODE,
} from './HTMLNodeType';
import { detachDeletedInstance, precacheFiberNode, updateFiberProps } from './ReactDOMComponentTree';
import { DefaultEventPriority, EventPriority } from 'react-reconciler/src/ReactEventPriorities';
import { getEventPriority } from '../events/ReactDOMEventListener';

export type Props = {
  autoFocus?: boolean,
  children?: any,
  disabled?: boolean,
  hidden?: boolean,
  suppressHydrationWarning?: boolean,
  dangerouslySetInnerHTML?,
  style?: {display?: string,},
  bottom?: null | number,
  left?: null | number,
  right?: null | number,
  top?: null | number,
  is?: string,
  size?: number,
  multiple?: boolean,
};
export type Instance = Element;
export type TextInstance = Text;
export type HostContext = any;

export interface SuspenseInstance extends Comment {
  _reactRetry?: () => void;
}

export const supportsSingletons = true;

// -------------------
//     Resources
// -------------------

export const supportsResources = true;

export function appendInitialChild(
  parentInstance: Instance,
  child: Instance | TextInstance,
): void {
  parentInstance.appendChild(child);
}

export function finalizeInitialChildren(
  domElement,
  type: string,
  props: Props,
): boolean {
  setInitialProperties(domElement, type, props);
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return !!props.autoFocus;
    case 'img':
      return true;
    default:
      return false;
  }
}

export function prepareUpdate(updatePayload, oldProps, newProps) {
  return diffProperties(updatePayload, oldProps, newProps)
}

export function createTextInstance (content) {
  return document.createTextNode(content)
}

export function createInstance(type, props, internalInstanceHandle) {
  const domElement = document.createElement(type)
  precacheFiberNode(internalInstanceHandle, domElement);
  updateFiberProps(domElement, props);
  return domElement
}

export function insertBefore(
  parentInstance: Instance,
  child: Instance | TextInstance,
  beforeChild: Instance | TextInstance,
): void {
  parentInstance.insertBefore(child, beforeChild);
}

export function appendChild(
  parentInstance: Instance,
  child: Instance | TextInstance,
): void {
  parentInstance.appendChild(child);
}

export function resetTextContent(domElement: Instance): void {
  setTextContent(domElement, '');
}

export function commitTextUpdate(
  textInstance: TextInstance,
  oldText: string,
  newText: string,
): void {
  textInstance.nodeValue = newText;
}

export function insertInContainerBefore(
  container: Container,
  child: Instance | TextInstance,
  beforeChild: Instance | TextInstance,
): void {
  if (container?.nodeType === COMMENT_NODE) {
    container?.parentNode?.insertBefore(child, beforeChild);
  } else {
    container?.insertBefore(child, beforeChild);
  }
}

export function appendChildToContainer(
  container: Container,
  child: Instance | TextInstance,
): void {
  let parentNode;
  if (container?.nodeType === COMMENT_NODE) {
    parentNode = container?.parentNode;
    parentNode.insertBefore(child, container);
  } else {
    parentNode = container;
    parentNode.appendChild(child);
  }
  // This container might be used for a portal.
  // If something inside a portal is clicked, that click should bubble
  // through the React tree. However, on Mobile Safari the click would
  // never bubble through the *DOM* tree unless an ancestor with onclick
  // event exists. So we wouldn't see it and dispatch it.
  // This is why we ensure that non React root containers have inline onclick
  // defined.
  // https://github.com/facebook/react/issues/11918
  // const reactRootContainer = container._reactRootContainer;
  // if (
  //   (reactRootContainer === null || reactRootContainer === undefined) &&
  //   parentNode.onclick === null
  // ) {
  //   // TODO: This cast may not be sound for SVG, MathML or custom elements.
  //   trapClickOnNonInteractiveElement(((parentNode: any): HTMLElement));
  // }
}


export function commitUpdate(
  domElement: Instance,
  updatePayload: any,
  type: string,
  oldProps: Props,
  newProps: Props,
  internalInstanceHandle: Object,
): void {
  // Diff and update the properties.
  updateProperties(domElement, type, oldProps, newProps);

  // Update the props handle so that we know which props are the ones with
  // with current event handlers.
  updateFiberProps(domElement, newProps);
}

export function clearContainer(container: Container): void {
  const nodeType = container?.nodeType;
  if (nodeType === DOCUMENT_NODE) {
    clearContainerSparingly(container);
  } else if (nodeType === ELEMENT_NODE) {
    switch (container?.nodeName) {
      case 'HEAD':
      case 'HTML':
      case 'BODY':
        clearContainerSparingly(container);
        return;
      default: {
        container && (container.textContent = '');
      }
    }
  }
}

function clearContainerSparingly(container: any) {
  let node;
  let nextNode: any = container.firstChild;
  if (nextNode && nextNode.nodeType === DOCUMENT_TYPE_NODE) {
    nextNode = nextNode.nextSibling;
  }
  while (nextNode) {
    node = nextNode;
    nextNode = nextNode.nextSibling;
    switch (node.nodeName) {
      case 'HTML':
      case 'HEAD':
      case 'BODY': {
        const element: Element = node;
        clearContainerSparingly(element);
        // If these singleton instances had previously been rendered with React they
        // may still hold on to references to the previous fiber tree. We detatch them
        // prospectively to reset them to a baseline starting state since we cannot create
        // new instances.
        detachDeletedInstance(element);
        continue;
      }
      // Script tags are retained to avoid an edge case bug. Normally scripts will execute if they
      // are ever inserted into the DOM. However when streaming if a script tag is opened but not
      // yet closed some browsers create and insert the script DOM Node but the script cannot execute
      // yet until the closing tag is parsed. If something causes React to call clearContainer while
      // this DOM node is in the document but not yet executable the DOM node will be removed from the
      // document and when the script closing tag comes in the script will not end up running. This seems
      // to happen in Chrome/Firefox but not Safari at the moment though this is not necessarily specified
      // behavior so it could change in future versions of browsers. While leaving all scripts is broader
      // than strictly necessary this is the least amount of additional code to avoid this breaking
      // edge case.
      //
      // Style tags are retained because they may likely come from 3rd party scripts and extensions
      case 'SCRIPT':
      case 'STYLE': {
        continue;
      }
      // Stylesheet tags are retained because tehy may likely come from 3rd party scripts and extensions
      case 'LINK': {
        if (node.rel.toLowerCase() === 'stylesheet') {
          continue;
        }
      }
    }
    container.removeChild(node);
  }
  return;
}

// -------------------
//     Mutation
// -------------------

export const supportsMutation = true;

/**
 * 获取事件优先级window.event.type
 */
export function getCurrentEventPriority(): EventPriority {
  const currentEvent = window.event;
  if (currentEvent === undefined) {
    return DefaultEventPriority;
  }
  return getEventPriority(currentEvent.type as any);
}

export function getPublicInstance(instance: Instance): Instance {
  return instance;
}

export function removeChild(
  parentInstance: Instance,
  child: Instance | TextInstance | SuspenseInstance,
): void {
  parentInstance.removeChild(child);
}

export function removeChildFromContainer(
  container,
  child,
): void {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.removeChild(child);
  } else {
    container.removeChild(child);
  }
}
