
import ReactCurrentDispatcher from './ReactCurrentDispatcher';
import ReactCurrentCache from './ReactCurrentCache';
import ReactCurrentBatchConfig from './ReactCurrentBatchConfig';
import ReactCurrentOwner from './ReactCurrentOwner';

const ReactSharedInternals = {
  ReactCurrentDispatcher,
  ReactCurrentCache,
  ReactCurrentBatchConfig,
  ReactCurrentOwner,
};

export default ReactSharedInternals;