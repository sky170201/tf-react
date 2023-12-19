import {
  allowConcurrentByDefault,
} from 'shared/ReactFeatureFlags';
import {
  createContainer,
  // createHydrationContainer,
  updateContainer,
  // flushSync,
  // isAlreadyRendering,
} from 'react-reconciler/src/ReactFiberReconciler';
import {ConcurrentRoot} from 'react-reconciler/src/ReactRootTags';
import { CreateRootOptions, RootType } from "../../client";
import { markContainerAsRoot } from 'react-dom-bindings/src/client/ReactDOMComponentTree';
import { listenToAllSupportedEvents } from 'react-dom-bindings/src/events/DOMPluginEventSystem';
import { Container } from 'index';
import ReactDOMSharedInternals from '../ReactDOMSharedInternals';
const {Dispatcher} = ReactDOMSharedInternals;

const isValidContainer = (container?) => true

/* global reportError */
const defaultOnRecoverableError =
  typeof reportError === 'function'
    ? // In modern browsers, reportError will dispatch an error event,
      // emulating an uncaught JavaScript error.
      reportError
    : (error) => {
        // In older browsers and test environments, fallback to console.error.
        // eslint-disable-next-line react-internal/no-production-logging
        console['error'](error);
      };


function ReactDOMRoot(this: any, internalRoot) {
  this._internalRoot = internalRoot;
}

ReactDOMRoot.prototype.render = function (children): void {
    const root = this._internalRoot;
    // 处理热更新重复创建
    root.containerInfo.innerHTML = ''
    if (root === null) {
      throw new Error('Cannot update an unmounted root.');
    }

    updateContainer(children, root, null, null);
  };

export function createRoot(
  container: Container,
  options?: CreateRootOptions,
): RootType {
  if (!isValidContainer(container)) {
    throw new Error('createRoot(...): Target container is not a DOM element.');
  }

  let isStrictMode = false;
  let concurrentUpdatesByDefaultOverride = false;
  let identifierPrefix = '';
  let onRecoverableError = defaultOnRecoverableError;
  let transitionCallbacks = null;

  if (options !== null && options !== undefined) {
    if (options.unstable_strictMode === true) {
      isStrictMode = true;
    }
    if (
      allowConcurrentByDefault &&
      options.unstable_concurrentUpdatesByDefault === true
    ) {
      concurrentUpdatesByDefaultOverride = true;
    }
    if (options.identifierPrefix !== undefined) {
      identifierPrefix = options.identifierPrefix;
    }
    if (options.onRecoverableError !== undefined) {
      onRecoverableError = options.onRecoverableError;
    }
    if (options.unstable_transitionCallbacks !== undefined) {
      transitionCallbacks = options.unstable_transitionCallbacks;
    }
  }

  const root = createContainer(
    container,
    ConcurrentRoot,
    null,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks,
  );
  markContainerAsRoot(root.current, container);
  // Dispatcher.current = ReactDOMClientDispatcher;
  listenToAllSupportedEvents(container);

  return new ReactDOMRoot(root);
}