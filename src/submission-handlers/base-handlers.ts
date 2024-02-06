import dayjs from 'dayjs';
import { getConcept, getAttachmentByUuid } from '../api/api';
import { ConceptTrue } from '../constants';
import { EncounterContext } from '../ohri-form-context';
import { OHRIFormField, OpenmrsEncounter, OpenmrsObs, SubmissionHandler } from '../api/types';
import { parseToLocalDateTime } from '../utils/ohri-form-helper';
import { flattenObsList, hasRendering } from '../utils/common-utils';
import { formatDate } from '@openmrs/esm-framework';
import { render } from '@testing-library/react';

// Temporarily holds observations that have already been binded with matching fields
export let assignedObsIds: string[] = [];

/**
 * Obs handler
 */

export const ObsSubmissionHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    if (field.questionOptions.rendering == 'checkbox') {
      return multiSelectObsHandler(field, value, context);
    }
    if (field.questionOptions.rendering == 'toggle') {
      return constructObs(value, context, field);
    }
    if (field.value) {
      if (context.sessionMode == 'edit' && !value) {
        field.value.voided = true;
      } else if (!value) {
        field.value = undefined;
      } else {
        if (field.questionOptions.rendering.startsWith('date')) {
          field.value.value = dayjs(value).format('YYYY-MM-DD HH:mm');
        } else {
          field.value.value = value;
        }
        field.value.voided = false;
      }
    } else {
      if (field.questionOptions.rendering.startsWith('date')) {
        field.value = constructObs(dayjs(value).format('YYYY-MM-DD HH:mm'), context, field);
        return field.value;
      }
      field.value = constructObs(value, context, field);
    }
    return field.value;
  },
  getInitialValue: (encounter: OpenmrsEncounter, field: OHRIFormField, allFormFields: Array<OHRIFormField>) => {
    if (hasRendering(field, 'file')) {
      const ac = new AbortController();
      return getAttachmentByUuid(encounter.patient['uuid'], encounter.uuid, ac);
    }
    const matchedObs = findObsByFormField(flattenObsList(encounter.obs), assignedObsIds, field);
    const rendering = field.questionOptions.rendering;
    if (matchedObs?.length) {
      if (field['groupId'] && !assignedObsIds.includes(matchedObs[0].obsGroup?.uuid)) {
        assignedObsIds.push(matchedObs[0].obsGroup?.uuid);
      }
      if (rendering == 'checkbox') {
        assignedObsIds.push(...matchedObs.map((obs) => obs.uuid));
        field.value = matchedObs;
        return field.value.map((o) => o.value.uuid);
      }
      const obs = matchedObs[0];
      field.value = JSON.parse(JSON.stringify(obs));
      assignedObsIds.push(obs.uuid);
      if (rendering == 'radio' || rendering == 'content-switcher') {
        getConcept(field.questionOptions.concept, 'custom:(uuid,display,datatype:(uuid,display,name))').subscribe(
          (result) => {
            if (result.datatype.name == 'Boolean') {
              field.value.value = obs.value.uuid;
            }
          },
        );
      }
      if (typeof obs.value == 'string' || typeof obs.value == 'number') {
        if (rendering.startsWith('date')) {
          const dateObject = parseToLocalDateTime(field.value.value);
          field.value.value = dayjs(dateObject).format('YYYY-MM-DD HH:mm');
          return dateObject;
        }
        return obs.value;
      }
      if (rendering == 'toggle') {
        field.value.value = obs.value.uuid;
        return obs.value == ConceptTrue;
      }
      if (rendering == 'fixed-value') {
        return field['fixedValue'];
      }
      return obs.value?.uuid;
    }
    return '';
  },
  getDisplayValue: (field: OHRIFormField, value: any) => {
    const rendering = field.questionOptions.rendering;
    if (!field.value) {
      return null;
    }
    if (field.questionOptions.rendering == 'checkbox') {
      return value.map(
        (chosenOption) => field.questionOptions.answers?.find((option) => option.concept == chosenOption)?.label,
      );
    }
    if (rendering == 'content-switcher' || rendering == 'select' || rendering == 'toggle') {
      const concept = typeof field.value.value === 'object' ? field.value.value.uuid : field.value.value;
      return field.questionOptions.answers?.find((option) => option.concept == concept)?.label;
    }
    if (rendering == 'radio') {
      return field.questionOptions.answers?.find((option) => option.concept == value)?.label;
    }
    return value;
  },
  getPreviousValue: (field: OHRIFormField, encounter: OpenmrsEncounter, allFormFields: Array<OHRIFormField>) => {
    let matchedObs = findObsByFormField(flattenObsList(encounter.obs), assignedObsIds, field);
    const rendering = field.questionOptions.rendering;
    if (matchedObs.length) {
      const obs = matchedObs[0];
      assignedObsIds.push(obs.uuid);
      if (field['groupId'] && !assignedObsIds.includes(obs.obsGroup?.uuid)) {
        assignedObsIds.push(obs.obsGroup?.uuid);
      }
      if (typeof obs.value == 'string' || typeof obs.value == 'number') {
        if (rendering == 'date' || rendering == 'datetime') {
          const dateObj = parseToLocalDateTime(`${obs.value}`);
          return { value: dateObj, display: dayjs(dateObj).format('YYYY-MM-DD HH:mm') };
        }
        return { value: obs.value, display: obs.value };
      }
      if (rendering == 'checkbox') {
        return matchedObs.map((each) => {
          return {
            value: each.value?.uuid,
            display: each.value?.name?.name,
          };
        });
      }
      if (rendering == 'toggle') {
        return {
          value: obs.value?.uuid,
          display: obs.value?.name?.name,
        };
      }
      return {
        value: obs.value?.uuid,
        display: field.questionOptions.answers?.find((option) => option.concept == obs.value?.uuid)?.label,
      };
    }
    return null;
  },
};

/**
 * Encounter location handler
 */
export const EncounterLocationSubmissionHandler: SubmissionHandler = {
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {
    return null;
  },
  getInitialValue: (encounter: any, field: OHRIFormField) => {
    return {
      display: encounter.location.name,
      uuid: encounter.location.uuid,
    };
  },
  getDisplayValue: (field: OHRIFormField, value) => {
    return value.display;
  },
};

///////////////////////////////
// Helpers
//////////////////////////////

const constructObs = (value: any, context: EncounterContext, field: OHRIFormField) => {
  return {
    person: context.patient?.id,
    obsDatetime: context.encounterDate,
    concept: field.questionOptions.concept,
    location: context.location,
    order: null,
    groupMembers: [],
    voided: false,
    // TODO: Update form path to:
    // 1. Follow standard patterns ie. NAMESPACE + "^" + FORMFIELD_PATH
    // 2. Remove "ohri" from the namespace
    formFieldNamespace: 'ohri-forms',
    formFieldPath: `ohri-forms-${field.id}`,
    value: value,
  };
};

/**
 * Retrieves a list of observations from a given `obsList` that correspond to the specified field.
 *
 * Notes:
 * If the query by field-path returns an empty list, the function falls back to querying
 * by concept and uses `claimedObsIds` to exclude already assigned observations.
 */
export const findObsByFormField = (
  obsList: Array<OpenmrsObs>,
  claimedObsIds: string[],
  field: OHRIFormField,
): OpenmrsObs[] => {
  const obs = obsList.filter((o) => o.formFieldPath == `ohri-forms-${field.id}`);
  // We shall fall back to mapping by the associated concept
  // That being said, we shall find all matching obs and pick the one that wasn't previously claimed.
  if (!obs?.length) {
    const obsByConcept = obsList.filter((obs) => obs.concept.uuid == field.questionOptions.concept);
    return claimedObsIds?.length ? obsByConcept.filter((obs) => !claimedObsIds.includes(obs.uuid)) : obsByConcept;
  }
  return obs;
};

const multiSelectObsHandler = (field: OHRIFormField, values: Array<string>, context: EncounterContext) => {
  if (!field.value) {
    field.value = [];
  }
  if (Array.isArray(values)) {
    values.forEach((value) => {
      const obs = field.value.find((o) => {
        if (typeof o.value == 'string') {
          return o.value == value;
        }
        return o.value.uuid == value;
      });
      if (obs && obs.voided) {
        obs.voided = false;
      } else {
        obs || field.value.push(constructObs(value, context, field));
      }
    });
  }

  // void or remove unchecked options
  field.questionOptions.answers
    .filter((opt) => Array.isArray(values) && !values?.some((v) => v == opt.concept))
    .forEach((opt) => {
      const observations = field.value.filter((o) => {
        if (typeof o.value == 'string') {
          return o.value == opt.concept;
        }
        return o.value.uuid == opt.concept;
      });
      if (!observations.length) {
        return;
      }
      observations.forEach((obs) => {
        if (context.sessionMode == 'edit' && obs.uuid) {
          obs.voided = true;
        } else {
          field.value = field.value.filter((o) => o.value !== opt.concept);
        }
      });
    });
  return field.value;
};

export function teardownBaseHandlerUtils() {
  assignedObsIds = [];
}
