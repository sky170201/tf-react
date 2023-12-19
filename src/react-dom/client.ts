import { Container } from 'index';
import { createRoot as createRootImpl } from './'

export type CreateRootOptions = any
export type RootType = any

export function createRoot(
  container: Container,
  options?: CreateRootOptions,
): RootType {
  return createRootImpl(container, options);
}