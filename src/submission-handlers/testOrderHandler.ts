import dayjs from 'dayjs';
import { FormField, OpenmrsEncounter, OpenmrsObs, SubmissionHandler } from '..';
import { flattenObsList, hasRendering } from '../utils/common-utils';
import { parseToLocalDateTime } from '../utils/form-helper';
import { EncounterContext } from '../form-context';

// Temporarily holds observations that have already been binded with matching fields
export let assignedObsIds: string[] = [];

/**
 * Obs handler
 */

export const TestOrderSubmissionHandler: SubmissionHandler = {
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {
      return constructOrder(value, context, field)
  },

  getInitialValue: (encounter: OpenmrsEncounter, field: FormField, allFormFields: Array<FormField>) => {
    let testOrderUuids = [];

    encounter?.orders.forEach(element => {
      testOrderUuids.push(element?.concept.uuid);
    });
    return testOrderUuids;
  },
  getDisplayValue: (field: FormField, value: any) => {
    const rendering = field.questionOptions.rendering;
    if (!field.value) {
      return null;
    }
    if (field.questionOptions.rendering == 'checkbox') {
      return value.map(
        (chosenOption) => field.questionOptions.answers?.find((option) => option.concept == chosenOption)?.label,
      );
    }
    if (rendering == 'content-switcher' || rendering == 'select' || rendering == 'toggle' || rendering == 'testOrder') {
      const concept = typeof field.value.value === 'object' ? field.value.value.uuid : field.value.value;
      return field.questionOptions.answers?.find((option) => option.concept == concept)?.label;
    }
    if (rendering == 'radio') {
      return field.questionOptions.answers?.find((option) => option.concept == value)?.label;
    }
    return value;
  },
  getPreviousValue: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => {
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

///////////////////////////////
// Helpers
//////////////////////////////

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
  field: FormField,
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

export function teardownBaseHandlerUtils() {
  assignedObsIds = [];
}

const constructOrder = (value: any, context: EncounterContext, field: FormField) => {
  return {
    action: 'NEW',
    urgency: 'ROUTINE',
    patient: context.patient?.id,
    concept: value,
    type: field?.questionOptions?.orderType,
    careSetting: field?.questionOptions?.orderSettingUuid,
    orderer: context?.encounterProvider,
  };
};

