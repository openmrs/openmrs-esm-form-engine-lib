import { OHRIFormField } from '../../api/types';
import { getRegisteredControl } from '../../registry/registry';
import { isTrue } from '../../utils/boolean-utils';

/**
 * Retrieves the appropriate field control for a question, considering missing concepts.
 * If the question is of type 'obs' and has a missing concept, it falls back to a disabled text input.
 * Otherwise, it retrieves the registered control based on the rendering specified in the question.
 * @param question - The OHRIFormField representing the question.
 * @returns The field control to be used for rendering the question.
 */
export function getFieldControlWithFallback(question: OHRIFormField) {
  // Check if the question has a missing concept
  if (hasMissingConcept(question)) {
    // If so, render a disabled text input
    question.disabled = true;
    return getRegisteredControl('text');
  }

  //Rendering overrides for existing AFE form schemas
  if (question.type === 'encounterLocation') {
    question.questionOptions.rendering = 'encounter-location';
  }

  // Retrieve the registered control based on the specified rendering
  return getRegisteredControl(question.questionOptions.rendering);
}

/**
 * Determines whether a field can be unspecified
 */
export function isUnspecifiedSupported(question: OHRIFormField) {
  return (
    isTrue(question.unspecified) &&
    question.questionOptions.rendering != 'toggle' &&
    question.questionOptions.rendering != 'encounter-location'
  );
}

export function hasMissingConcept(question: OHRIFormField) {
  return (
    question.type == 'obs' && !question.questionOptions.concept && question.questionOptions.rendering !== 'fixed-value'
  );
}
