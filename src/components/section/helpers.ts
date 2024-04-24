import { formatDate } from '@openmrs/esm-framework';
import { getRegisteredControl } from '../../registry/registry';
import { isTrue } from '../../utils/boolean-utils';
import { FormField } from '../../types';

/**
 * Retrieves the appropriate field control for a question, considering missing concepts.
 * If the question is of type 'obs' and has a missing concept, it falls back to a disabled text input.
 * Otherwise, it retrieves the registered control based on the rendering specified in the question.
 * @param question - The FormField representing the question.
 * @returns The field control to be used for rendering the question.
 */
export function getFieldControlWithFallback(question: FormField) {
  // Check if the question has a missing concept
  if (hasMissingConcept(question)) {
    // If so, render a disabled text input
    question.disabled = true;
    return getRegisteredControl('text');
  }

  // Retrieve the registered control based on the specified rendering
  return getRegisteredControl(question.questionOptions.rendering);
}

/**
 * Determines whether a field can be unspecified
 */
export function isUnspecifiedSupported(question: FormField) {
  return (
    isTrue(question.unspecified) &&
    question.questionOptions.rendering != 'toggle' &&
    question.questionOptions.rendering != 'encounter-location'
  );
}

export function hasMissingConcept(question: FormField) {
  return (
    question.type == 'obs' && !question.questionOptions.concept && question.questionOptions.rendering !== 'fixed-value'
  );
}

function previousValueDisplayForCheckbox(previosValueItems: Object[]): String {
  return previosValueItems.map((eachItem) => eachItem['display']).join(', ');
}

export const formatPreviousValueDisplayText = (question: FormField, value: any) => {
  switch (question.questionOptions.rendering) {
    case 'date':
      return formatDate(new Date(value?.value));
    case 'checkbox':
      return Array.isArray(value) ? previousValueDisplayForCheckbox(value) : null;
    default:
      return value?.display;
  }
};
