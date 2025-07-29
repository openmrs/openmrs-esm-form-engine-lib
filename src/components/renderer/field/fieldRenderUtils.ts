import { type SessionMode } from '../../../types';

/**
 * @name shouldRenderField
 * @description Determines if a field should be rendered based on the session mode, whether it is transient, and if it is empty.
 * - A field will not be rendered in 'embedded-view' mode if it is transient and has no value.
 */
export function shouldRenderField(sessionMode: SessionMode, isTransient: boolean, isEmpty: boolean): boolean {
  return !(sessionMode === 'embedded-view' && isTransient && isEmpty);
}
