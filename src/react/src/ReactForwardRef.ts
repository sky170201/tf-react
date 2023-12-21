
import { REACT_FORWARD_REF_TYPE } from 'shared/ReactSymbols';

export function forwardRef(render): any {
  const elementType = {
    $$typeof: REACT_FORWARD_REF_TYPE,
    render,
  };
  return elementType;
}
