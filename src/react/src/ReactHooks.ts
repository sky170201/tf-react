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