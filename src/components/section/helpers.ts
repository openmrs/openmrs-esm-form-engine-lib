import { formatDate } from '@openmrs/esm-framework';
import { getRegisteredControl } from '../../registry/registry';
import { isTrue } from '../../utils/boolean-utils';
import { type OpenmrsObs, type FormField } from '../../types';
import { parseToLocalDateTime } from '../../utils/form-helper';
import dayjs from 'dayjs';
import { format } from 'path';
import { render } from '@testing-library/react';

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
      if (value instanceof Date) {
        return formatDate(value);
      }
      return formatDate(new Date(value?.display)) || formatDate(value?.value);
    case 'checkbox':
      return Array.isArray(value) ? previousValueDisplayForCheckbox(value) : value.display;
    default:
      return value?.display;
  }
};

export const historicalValueTransformer = (field: FormField, obs: OpenmrsObs) => {
  const rendering = field.questionOptions.rendering;

  if (typeof obs.value === 'string' || typeof obs.value === 'number') {
    if (rendering === 'date' || rendering === 'datetime') {
      const dateObj = parseToLocalDateTime(`${obs.value}`);
      return { value: dateObj, display: dayjs(dateObj).format('YYYY-MM-DD HH:mm') };
    }
    return { value: obs.value, display: obs.value };
  } else if (['toggle', 'checkbox'].includes(rendering)) {
    return {
      value: obs.value?.uuid,
      display: obs.value?.name?.name,
    };
  } else {
    return {
      value: obs.value?.uuid,
      display: field.questionOptions.answers?.find((option) => option.concept === obs.value?.uuid)?.label,
    };
  }
};
