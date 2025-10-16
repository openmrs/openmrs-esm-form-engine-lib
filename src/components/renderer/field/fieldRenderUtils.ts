import { type SessionMode } from '../../../types';

/**
 * @name shouldRenderField
 * @description Returns true if a field should be rendered.
 * A field is hidden in 'embedded-view' mode when it is empty
 * and either transient or `hideUnansweredQuestionsInReadonlyForms` is enabled.
 */
export function shouldRenderField(
  sessionMode: SessionMode,
  isTransient: boolean,
  isEmptyValue: boolean,
  hideUnansweredQuestionsInReadonlyForms: boolean,
): boolean {
  return !(sessionMode === 'embedded-view' && isEmptyValue && (isTransient || hideUnansweredQuestionsInReadonlyForms));
}
