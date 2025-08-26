import dayjs from 'dayjs';
import { ConceptTrue, codedTypes } from '../constants';
import {
  type Attachment,
  type OpenmrsObs,
  type FormField,
  type OpenmrsEncounter,
  type ValueAndDisplay,
  type FormFieldValueAdapter,
} from '../types';
import {
  hasRendering,
  gracefullySetSubmission,
  clearSubmission,
  flattenObsList,
  parseToLocalDateTime,
  formatDateAsDisplayString,
} from '../utils/common-utils';
import { type FormContextProps } from '../provider/form-provider';
import { isEmpty } from '../validators/form-validator';
import { attachmentUrl, getAttachmentByUuid, type OpenmrsResource } from '@openmrs/esm-framework';

// Temporarily holds observations that have already been bound with matching fields
export let assignedObsIds: string[] = [];

export const ObsAdapter: FormFieldValueAdapter = {
  async getInitialValue(field: FormField, sourceObject: any, context: FormContextProps) {
    const encounter = sourceObject ?? (context.domainObjectValue as OpenmrsEncounter);
    const matchingObs = findObsByFormField(flattenObsList(encounter.obs), assignedObsIds, field);
    if (hasRendering(field, 'file') && matchingObs?.length) {
      return resolveAttachmentsFromObs(field, matchingObs);
    }
    return extractFieldValue(field, matchingObs, true);
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
    if (value instanceof Date) {
      return formatDateAsDisplayString(field, value);
    }
    if (rendering === 'checkbox') {
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
  transformFieldValue: (field: FormField, value: any, context: FormContextProps) => {
    // clear previous submission
    clearSubmission(field);
    if (!field.meta.initialValue?.omrsObject && isEmpty(value)) {
      return null;
    }
    if (hasRendering(field, 'checkbox')) {
      return handleMultiSelect(field, Array.isArray(value) ? value : [value]);
    }
    if (hasRendering(field, 'file')) {
      return handleAttachments(field, value);
    }
    if (!isEmpty(value) && hasPreviousObsValueChanged(field, value)) {
      return gracefullySetSubmission(field, editObs(field, value), undefined);
    }
    if (field.meta.initialValue?.omrsObject && isEmpty(value)) {
      return gracefullySetSubmission(field, undefined, voidObs(field.meta.initialValue.omrsObject as OpenmrsObs));
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
      initialValue: {
        omrsObject: null,
        refinedValue: null,
      },
    };
  }
  if (obsList.length) {
    if (rendering == 'checkbox') {
      assignedObsIds.push(...obsList.map((obs) => obs.uuid));
      field.meta.initialValue.omrsObject = makeFieldDirty ? obsList : null;
      return obsList.map((o) => o.value.uuid);
    }
    const obs = obsList[0];
    if (makeFieldDirty) {
      field.meta.initialValue.omrsObject = { ...obs };
    }
    assignedObsIds.push(obs.uuid);
    if (typeof obs.value === 'string' || typeof obs.value === 'number') {
      if (rendering.startsWith('date')) {
        const dateObject = parseToLocalDateTime(obs.value as string);
        if (makeFieldDirty) {
          const obsObject = field.meta.initialValue.omrsObject as OpenmrsObs;
          obsObject.value = dayjs(dateObject).format('YYYY-MM-DD HH:mm');
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

export function constructObs(field: FormField, value: any): Partial<OpenmrsObs> {
  if (isEmpty(value) && field.type !== 'obsGroup') {
    return null;
  }
  const draftObs =
    field.type === 'obsGroup'
      ? { groupMembers: [] }
      : {
          value: field.questionOptions.rendering.startsWith('date') ? formatDateByPickerType(field, value) : value,
        };
  return {
    ...draftObs,
    concept: field.questionOptions.concept,
    formFieldNamespace: 'rfe-forms',
    formFieldPath: `rfe-forms-${field.id}`,
  };
}

export function voidObs(obs: OpenmrsObs) {
  return { uuid: obs.uuid, voided: true };
}

export function editObs(field: FormField, newValue: any) {
  const oldObs = field.meta.initialValue?.omrsObject as OpenmrsResource;
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
  const previousObs = field.meta.initialValue?.omrsObject as OpenmrsResource;
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
  const obsArray = field.meta.initialValue?.omrsObject as Array<OpenmrsResource>;
  if (obsArray?.length && isEmpty(values)) {
    // we assume the user cleared the existing value(s)
    // so we void all previous values
    return gracefullySetSubmission(
      field,
      null,
      obsArray.map((previousValue) => voidObs(previousValue)),
    );
  }
  if (obsArray?.length && !isEmpty(values)) {
    const toBeVoided = obsArray.filter((obs) => !values.includes(obs.value.uuid));
    const toBeCreated = values.filter((v) => !obsArray.some((obs) => obs.value.uuid === v));
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

function handleAttachments(field: FormField, attachments: Attachment[] = []) {
  const voided = attachments
    .filter((attachment) => attachment.uuid && attachment.voided)
    .map((voided) => ({ uuid: voided.uuid, voided: true }));
  const newAttachments = (field.meta.submission.newValue = attachments
    .filter((attachment) => !attachment.uuid)
    .map((newAttachment) => ({
      formFieldNamespace: 'rfe-forms',
      formFieldPath: `rfe-forms-${field.id}`,
      ...newAttachment,
    })));
  return gracefullySetSubmission(field, newAttachments, voided);
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
  const obs = obsList.filter((candidate) => {
    // we ignore the concept for attachments because they're managed from the backend
    if (hasRendering(field, 'file') && candidate.formFieldPath == `rfe-forms-${field.id}`) {
      return true;
    }
    return (
      candidate.formFieldPath == `rfe-forms-${field.id}` && candidate.concept.uuid == field.questionOptions.concept
    );
  });

  // We shall fall back to mapping by the associated concept
  // That being said, we shall find all matching obs and pick the one that wasn't previously claimed.
  if (!obs?.length) {
    const obsByConcept = obsList.filter((obs) => obs.concept.uuid == field.questionOptions.concept);
    return claimedObsIds?.length ? obsByConcept.filter((obs) => !claimedObsIds.includes(obs.uuid)) : obsByConcept;
  }

  return obs;
}

async function resolveAttachmentsFromObs(field: FormField, obs: OpenmrsObs[]) {
  const abortController = new AbortController();
  const attachments = await Promise.all(
    obs.map((obs) =>
      getAttachmentByUuid(obs.uuid, abortController)
        .then((response) => response.data)
        .catch((error) => {
          console.error(`Failed to fetch attachment ${obs.uuid}:`, error);
          return null;
        }),
    ),
  );

  field.meta.initialValue = {
    omrsObject: obs,
  };
  return attachments.filter(Boolean).map((attachment) => ({
    uuid: attachment.uuid,
    base64Content: `${window.openmrsBase}${attachmentUrl}/${attachment.uuid}/bytes`,
    fileName: attachment.filename,
    fileDescription: attachment.comment,
    fileType: attachment.bytesContentFamily?.toLowerCase(),
  })) as Attachment[];
}
