import { Dispatcher } from 'react-reconciler/src/ReactInternalTypes';
import ReactCurrentDispatcher from './ReactCurrentDispatcher';

function resolveDispatcher(): Dispatcher {
  const dispatcher = ReactCurrentDispatcher.current;
  // 'Invalid hook call. Hooks can only be called inside of the body of a function component.'
  if (dispatcher === null) {
		throw new Error('hook只能在函数组件中执行');
  } 
  // Will result in a null access error if accessed outside render phase. We
  // intentionally don't throw our own error because this is in a hot path.
  // Also helps ensure this is inlined.
  return dispatcher;
}


type BasicStateAction<S> = ((S) => S) | S;
type Dispatch<A> = (A) => void;

export function useState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] | any {
  const dispatcher: any = resolveDispatcher();
  return dispatcher?.useState(initialState);
}

export function useEffect(
  create: () => (() => void) | void,
  deps: Array<any> | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher?.useEffect?.(create, deps);
}

export function useLayoutEffect(
  create: () => (() => void) | void,
  deps: Array<any> | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher?.useLayoutEffect?.(create, deps);
}

export function useReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: (I) => S,
): [S, Dispatch<A>] | any {
  const dispatcher = resolveDispatcher();
  return dispatcher?.useReducer?.(reducer, initialArg, init);
}

export function useRef<T>(initialValue?: T): {current: T} | any {
  const dispatcher = resolveDispatcher();
  return dispatcher?.useRef?.(initialValue);
}

export function useImperativeHandle<T>(
  ref: {current: T | null} | ((inst: T | null) => any) | null | void,
  create: () => T,
  deps: Array<any> | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher?.useImperativeHandle?.(ref, create, deps);
}

export function useCallback<T>(
  callback: T,
  deps: Array<any> | void | null,
): T | any {
  const dispatcher = resolveDispatcher();
  return dispatcher?.useCallback?.(callback, deps);
}

export function useMemo<T>(
  create: () => T,
  deps: Array<any> | void | null,
): T | any {
  const dispatcher = resolveDispatcher();
  return dispatcher?.useMemo?.(create, deps);
}
