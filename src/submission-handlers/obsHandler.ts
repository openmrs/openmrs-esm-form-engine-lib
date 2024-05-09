import dayjs from 'dayjs';
import { getAttachmentByUuid } from '../api/api';
import { ConceptTrue, codedTypes } from '../constants';
import { type EncounterContext } from '../form-context';
import { type OpenmrsObs, type FormField, type OpenmrsEncounter, type SubmissionHandler } from '../types';
import { hasRendering, flattenObsList, clearSubmission, gracefullySetSubmission } from '../utils/common-utils';
import { parseToLocalDateTime } from '../utils/form-helper';
import { isEmpty } from '../validators/form-validator';

// Temporarily holds observations that have already been binded with matching fields
export let assignedObsIds: string[] = [];

export const ObsSubmissionHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
    // clear previous submission
    clearSubmission(field);
    if (!field.meta.previousValue && isEmpty(value)) {
      return null;
    }
    if (hasRendering(field, 'checkbox')) {
      return handleMultiSelect(field, value, context);
    }
    if (!isEmpty(value) && hasPreviousObsValueChanged(field, value)) {
      return gracefullySetSubmission(field, editObs(field, value), undefined);
    }
    if (field.meta.previousValue && isEmpty(value)) {
      return gracefullySetSubmission(field, undefined, voidObs(field.meta.previousValue));
    }
    if (!isEmpty(value)) {
      return gracefullySetSubmission(field, constructObs(field, value), undefined);
    }
    return null;
  },
  getInitialValue: (encounter: OpenmrsEncounter, field: FormField, allFormFields: Array<FormField>) => {
    if (hasRendering(field, 'file')) {
      const ac = new AbortController();
      // we probably want to move this to its own handler
      return getAttachmentByUuid(encounter.patient['uuid'], encounter.uuid, ac);
    }
    return extractFieldValue(field, findObsByFormField(flattenObsList(encounter.obs), assignedObsIds, field), true);
  },
  getDisplayValue: (field: FormField, value: any) => {
    const rendering = field.questionOptions.rendering;
    if (isEmpty(value)) {
      return value;
    }
    if (rendering == 'checkbox') {
      return value.map(
        (selected) => field.questionOptions.answers?.find((option) => option.concept == selected)?.label,
      );
    }
    if (rendering === 'toggle') {
      return value ? field.questionOptions.toggleOptions.labelTrue : field.questionOptions.toggleOptions.labelFalse;
    }
    if (codedTypes.includes(rendering)) {
      return field.questionOptions.answers?.find((option) => option.concept == value)?.label;
    }
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
    return extractFieldValue(field, findObsByFormField(flattenObsList(encounter.obs), assignedObsIds, field), false);
  },
};

// Helpers

/**
 * Extracts field's primitive value from obs
 */
function extractFieldValue(field: FormField, obsList: OpenmrsObs[] = [], makeFieldDirty = false) {
  const rendering = field.questionOptions.rendering;
  if (!field.meta) {
    field.meta = {
      previousValue: null,
    };
  }
  if (obsList.length) {
    if (rendering == 'checkbox') {
      assignedObsIds.push(...obsList.map((obs) => obs.uuid));
      field.meta.previousValue = makeFieldDirty ? obsList : null;
      return obsList.map((o) => o.value.uuid);
    }
    const obs = obsList[0];
    if (makeFieldDirty) {
      field.meta.previousValue = { ...obs };
    }
    assignedObsIds.push(obs.uuid);
    if (typeof obs.value === 'string' || typeof obs.value === 'number') {
      if (rendering.startsWith('date')) {
        const dateObject = parseToLocalDateTime(obs.value as string);
        if (makeFieldDirty) {
          field.meta.previousValue.value = dayjs(dateObject).format('YYYY-MM-DD HH:mm');
        }
        return dateObject;
      }
      return obs.value;
    }
    if (rendering == 'toggle') {
      return obs.value.uuid === ConceptTrue;
    }
    if (rendering == 'fixed-value') {
      return field['fixedValue'];
    }
    return obs.value?.uuid;
  }
  return '';
}

export function constructObs(field: FormField, value: any) {
  if (isEmpty(value) && field.type !== 'obsGroup') {
    return null;
  }
  const draftObs =
    field.type === 'obsGroup'
      ? { groupMembers: [] }
      : {
          value: field.questionOptions.rendering.startsWith('date') ? formatDate(field, value) : value,
        };
  return {
    ...draftObs,
    concept: field.questionOptions.concept,
    formFieldNamespace: 'rfe-forms',
    // TODO: the prefix seems redundant here, should we considers using the form name instead?
    // what happens when the name is changed?
    formFieldPath: `rfe-forms-${field.id}`,
  };
}

export function voidObs(obs: OpenmrsObs) {
  return { uuid: obs.uuid, voided: true };
}

function editObs(field: FormField, newValue: any) {
  const oldObs = field.meta.previousValue;
  const formatedValue = field.questionOptions.rendering.startsWith('date') ? formatDate(field, newValue) : newValue;
  return {
    uuid: oldObs.uuid,
    value: formatedValue,
    formFieldNamespace: 'rfe-forms',
    formFieldPath: `rfe-forms-${field.id}`,
  };
}

function formatDate(field: FormField, value: any) {
  if (hasRendering(field, 'date')) {
    return dayjs(value).format('YYYY-MM-DD');
  }
  if (hasRendering(field, 'datetime')) {
    return dayjs(value).format('YYYY-MM-DD HH:mm');
  }
  return value;
}

export function hasPreviousObsValueChanged(field: FormField, newValue: any) {
  const previousObs = field.meta.previousValue;
  if (isEmpty(previousObs)) {
    return false;
  }
  if (codedTypes.includes(field.questionOptions.rendering)) {
    return previousObs.value.uuid !== newValue;
  }
  if (hasRendering(field, 'date')) {
    return dayjs(newValue).diff(dayjs(previousObs.value), 'D') !== 0;
  }
  if (hasRendering(field, 'datetime')) {
    return dayjs(newValue).diff(dayjs(previousObs.value), 'minute') !== 0;
  }
  // Question: should we continue supporting toggles?
  if (hasRendering(field, 'toggle')) {
    return (previousObs.value.uuid === ConceptTrue) !== newValue;
  }
  return previousObs.value !== newValue;
}

function handleMultiSelect(field: FormField, values: Array<string> = [], context: EncounterContext) {
  // three possible scenarios
  // 1. we have a previous value and an empty current value
  // 2. a mix of both (previous and current)
  // 3. we only have a current value

  if (field.meta.previousValue && isEmpty(values)) {
    // we assume the user cleared the existing value(s)
    // so we void all previous values
    return gracefullySetSubmission(
      field,
      null,
      field.meta.previousValue.map((previousValue) => voidObs(previousValue)),
    );
  }
  if (field.meta.previousValue && !isEmpty(values)) {
    const toBeVoided = field.meta.previousValue.filter((obs) => !values.includes(obs.value.uuid));
    const toBeCreated = values.filter((v) => !field.meta.previousValue.some((obs) => obs.value.uuid === v));
    return gracefullySetSubmission(
      field,
      toBeCreated.map((value) => constructObs(field, value)),
      toBeVoided.map((obs) => voidObs(obs)),
    );
  }
  return gracefullySetSubmission(
    field,
    values.map((value) => constructObs(field, value)),
    undefined,
  );
}

/**
 * Retrieves a list of observations from a given `obsList` that correspond to the specified field.
 *
 * Notes:
 * If the query by field-path returns an empty list, the function falls back to querying
 * by concept and uses `claimedObsIds` to exclude already assigned observations.
 */
export function findObsByFormField(
  obsList: Array<OpenmrsObs>,
  claimedObsIds: string[],
  field: FormField,
): OpenmrsObs[] {
  const obs = obsList.filter(
    (o) => o.formFieldPath == `rfe-forms-${field.id}` && o.concept.uuid == field.questionOptions.concept,
  );

  // We shall fall back to mapping by the associated concept
  // That being said, we shall find all matching obs and pick the one that wasn't previously claimed.
  if (!obs?.length) {
    const obsByConcept = obsList.filter((obs) => obs.concept.uuid == field.questionOptions.concept);
    return claimedObsIds?.length ? obsByConcept.filter((obs) => !claimedObsIds.includes(obs.uuid)) : obsByConcept;
  }

  return obs;
}

export function teardownObsHandler() {
  assignedObsIds = [];
}
