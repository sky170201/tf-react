
import { Container } from 'index';
import {
  createRoot as createRootImpl,
} from './ReactDOMRoot';


function createRoot(
  container: Container,
  options?,
) {
  return createRootImpl(container, options);
}

export {
  // render,
  createRoot,
};