import dayjs from 'dayjs';
import { codedTypes, ConceptTrue } from '../constants';
import {
  type Attachment,
  type AttachmentResponse,
  type FormField,
  type FormFieldValueAdapter,
  type OpenmrsEncounter,
  type OpenmrsObs,
  type ValueAndDisplay,
} from '../types';
import {
  clearSubmission,
  flattenObsList,
  formatDateAsDisplayString,
  gracefullySetSubmission,
  hasRendering,
  parseToLocalDateTime,
} from '../utils/common-utils';
import { type FormContextProps } from '../provider/form-provider';
import { isEmpty } from '../validators/form-validator';
import { getAttachmentByUuid } from '../api';
import { formatDate, restBaseUrl } from '@openmrs/esm-framework';

// Temporarily holds observations that have already been bound with matching fields
export let assignedObsIds: string[] = [];

export const ObsAdapter: FormFieldValueAdapter = {
  async getInitialValue(field: FormField, sourceObject: any, context: FormContextProps) {
    const encounter = sourceObject ?? (context.domainObjectValue as OpenmrsEncounter);
    if (hasRendering(field, 'file')) {
      const ac = new AbortController();
      const attachmentsResponse = await getAttachmentByUuid(context.patient.id, encounter.uuid, ac);
      // TODO: This seems like a violation of the data model.
      // I think we should instead use something like `formFieldPath` to do the mapping.
      const rawAttachment = attachmentsResponse.results?.find((attachment) => attachment.comment === field.id);
      return rawAttachment ? generateAttachment(rawAttachment) : null;
    }
    return extractFieldValue(field, findObsByFormField(flattenObsList(encounter.obs), assignedObsIds, field), true);
  },
  async getPreviousValue(field: FormField, sourceObject: any, context: FormContextProps): Promise<ValueAndDisplay> {
    const encounter = sourceObject ?? (context.previousDomainObjectValue as OpenmrsEncounter);
    if (encounter) {
      const value = extractFieldValue(
        field,
        findObsByFormField(flattenObsList(encounter.obs), assignedObsIds, field),
        true,
      );
      if (!isEmpty(value)) {
        return {
          value,
          display: this.getDisplayValue(field, value),
        };
      }
    }
    return null;
  },
  getDisplayValue: (field: FormField, value: any) => {
    const rendering = field.questionOptions.rendering;
    if (isEmpty(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((val) => getDisplayValueForSingleObs(field, val)).join(', ');
    }

    return getDisplayValueForSingleObs(field, value);
  },
  transformFieldValue: (field: FormField, value: any, context: FormContextProps) => {
    // clear previous submission
    clearSubmission(field);

    if (!field.meta.previousValue && isEmpty(value)) {
      return null;
    }

    // Handle `obsGroup` recursively
    if (field.type === 'obsGroup' && Array.isArray(field.questions)) {
      const groupObs = field.questions.map((nestedField) =>
        ObsAdapter.transformFieldValue(nestedField, nestedField.value, context),
      );
      return gracefullySetSubmission(field, { groupMembers: groupObs }, undefined);
    }

    if (hasRendering(field, 'checkbox')) {
      return handleMultiSelect(field, value);
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
  tearDown: function (): void {
    assignedObsIds = [];
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

/**
 * Extracts field's display value
 */

function getDisplayValueForSingleObs(field: FormField, value: any) {
  const rendering = field.questionOptions.rendering;

  if (value instanceof Date) {
    return formatDateAsDisplayString(field, value);
  }
  if (rendering == 'checkbox') {
    return value.map((selected) => field.questionOptions.answers?.find((option) => option.concept == selected)?.label);
  }
  if (rendering === 'toggle') {
    return value ? field.questionOptions.toggleOptions.labelTrue : field.questionOptions.toggleOptions.labelFalse;
  }
  if (codedTypes.includes(rendering)) {
    return field.questionOptions.answers?.find((option) => option.concept == value)?.label;
  }
  return value;
}

export function constructObs(field: FormField, value: any): Partial<OpenmrsObs> {
  if (isEmpty(value) && field.type !== 'obsGroup') {
    return null;
  }

  const draftObs: Partial<OpenmrsObs> = {
    concept: field.questionOptions.concept,
    formFieldNamespace: 'rfe-forms',
    formFieldPath: `rfe-forms-${field.id}`,
  };

  if (field.type === 'obsGroup') {
    draftObs.groupMembers = value?.map((v: any) => constructObs(field, v)) || [];
  } else {
    draftObs.value = field.questionOptions.rendering.startsWith('date') ? formatDateByPickerType(field, value) : value;
  }

  return draftObs;
}

export function voidObs(obs: OpenmrsObs) {
  return { uuid: obs.uuid, voided: true };
}

export function editObs(field: FormField, newValue: any) {
  const oldObs = field.meta.previousValue;
  const formattedValue = field.questionOptions.rendering.startsWith('date')
    ? formatDateByPickerType(field, newValue)
    : newValue;
  return {
    uuid: oldObs.uuid,
    value: formattedValue,
    formFieldNamespace: 'rfe-forms',
    formFieldPath: `rfe-forms-${field.id}`,
  };
}

function formatDateByPickerType(field: FormField, value: Date) {
  if (field.datePickerFormat) {
    switch (field.datePickerFormat) {
      case 'calendar':
        return dayjs(value).format('YYYY-MM-DD');
      case 'timer':
        return dayjs(value).format('HH:mm');
      case 'both':
        return dayjs(value).format('YYYY-MM-DD HH:mm');
      default:
        return dayjs(value).format('YYYY-MM-DD');
    }
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
  if (hasRendering(field, 'datetime') || field.datePickerFormat === 'both') {
    return dayjs(newValue).diff(dayjs(previousObs.value), 'minute') !== 0;
  }
  if (hasRendering(field, 'toggle')) {
    return (previousObs.value.uuid === ConceptTrue) !== newValue;
  }
  return previousObs.value !== newValue;
}

function handleMultiSelect(field: FormField, values: Array<string> = []) {
  // three possible scenarios
  // 1. we have a previous value and an empty current value
  // 2. a mix of both (previous and current)
  // 3. we only have a current value

  // For `obsGroup` types, handle nested groups
  if (field.type === 'obsGroup' && Array.isArray(field.questions)) {
    return field.questions.map((nestedField) => handleMultiSelect(nestedField, nestedField.value));
  }

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

function generateAttachment(rawAttachment: AttachmentResponse): Attachment {
  const attachmentUrl = `${restBaseUrl}/attachment`;
  return {
    id: rawAttachment.uuid,
    src: `${window.openmrsBase}${attachmentUrl}/${rawAttachment.uuid}/bytes`,
    title: rawAttachment.comment,
    description: '',
    dateTime: formatDate(new Date(rawAttachment.dateTime), {
      mode: 'wide',
    }),
    bytesMimeType: rawAttachment.bytesMimeType,
    bytesContentFamily: rawAttachment.bytesContentFamily,
  };
}
