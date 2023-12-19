import { Dispatcher } from "react-reconciler/src/ReactInternalTypes";

const ReactCurrentDispatcher: {
  current: Dispatcher | null
} = {
  current: null,
};

export default ReactCurrentDispatcher;