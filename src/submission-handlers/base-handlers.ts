import moment from 'moment';
import { getConcept } from '../api/api';
import { ConceptTrue } from '../constants';
import { EncounterContext } from '../ohri-form-context';
import { OHRIFormField, OpenmrsEncounter, OpenmrsObs, SubmissionHandler } from '../api/types';
import { parseToLocalDateTime } from '../utils/ohri-form-helper';

// Temporarily holds observations that have already been binded with matching fields
let assignedObsIds: string[] = [];

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
          field.value.value = moment(value).format('YYYY-MM-DD HH:mm');
        } else {
          field.value.value = value;
        }
        field.value.voided = false;
      }
    } else {
      if (field.questionOptions.rendering.startsWith('date')) {
        field.value = constructObs(moment(value).format('YYYY-MM-DD HH:mm'), context, field);
        return field.value;
      }
      field.value = constructObs(value, context, field);
    }
    return field.value;
  },
  getInitialValue: (encounter: OpenmrsEncounter, field: OHRIFormField, allFormFields: Array<OHRIFormField>) => {
    let obs = findObsByFormField(encounter.obs, assignedObsIds, field);
    const rendering = field.questionOptions.rendering;
    let parentField = null;
    let obsGroup = null;
    // If this field is a group member and the obs was picked from the encounters's top obs leaves,
    // chances are high this obs wasn't captured as part of the obs group. return empty.
    // this should be solved by tracking obs through `formFieldNamespace`.
    if (obs && field['groupId']) {
      return '';
    }
    if (!obs && field['groupId']) {
      parentField = allFormFields.find(f => f.id == field['groupId']);
      obsGroup = findObsByFormField(encounter.obs, assignedObsIds, parentField);
      if (obsGroup) {
        assignedObsIds.push(obsGroup.uuid);
        parentField.value = obsGroup;
        if (obsGroup.groupMembers) {
          obs = findObsByFormField(obsGroup.groupMembers, assignedObsIds, field);
        }
      }
    }
    if (obs) {
      assignedObsIds.push(obs.uuid);
      field.value = JSON.parse(JSON.stringify(obs));
      if (rendering == 'radio' || rendering == 'content-switcher') {
        getConcept(field.questionOptions.concept, 'custom:(uuid,display,datatype:(uuid,display,name))').subscribe(
          result => {
            if (result.datatype.name == 'Boolean') {
              field.value.value = obs.value.uuid;
            }
          },
        );
      }
      if (typeof obs.value == 'string' || typeof obs.value == 'number') {
        if (field.questionOptions.rendering.startsWith('date')) {
          const dateObject = parseToLocalDateTime(field.value.value);
          field.value.value = moment(dateObject).format('YYYY-MM-DD HH:mm');
          return dateObject;
        }
        return obs.value;
      }
      if (field.questionOptions.rendering == 'checkbox') {
        field.value = encounter.obs.filter(o => o.concept.uuid == field.questionOptions.concept);
        if (!field.value.length && field['groupId']) {
          field.value = obsGroup.groupMembers.filter(o => o.concept.uuid == field.questionOptions.concept);
        }
        return field.value.map(o => o.value.uuid);
      }
      if (field.questionOptions.rendering == 'toggle') {
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
        chosenOption => field.questionOptions.answers.find(option => option.concept == chosenOption)?.label,
      );
    }
    if (rendering == 'content-switcher' || rendering == 'select' || rendering == 'toggle') {
      const concept = typeof field.value.value === 'object' ? field.value.value.uuid : field.value.value;
      return field.questionOptions.answers.find(option => option.concept == concept)?.label;
    }
    if (rendering == 'radio') {
      return field.questionOptions.answers.find(option => option.concept == value)?.label;
    }
    return value;
  },
  getPreviousValue: (field: OHRIFormField, encounter: OpenmrsEncounter, allFormFields: Array<OHRIFormField>) => {
    let obs = findObsByFormField(encounter.obs, assignedObsIds, field);
    const rendering = field.questionOptions.rendering;
    let parentField = null;
    let obsGroup = null;
    // If this field is a group member and the obs was picked from the encounters's top obs leaves,
    // chances are high this obs wasn't captured as part of the obs group. return empty.
    // this should be solved by tracking obs through `formFieldNamespace`.
    if (obs && field['groupId']) {
      return '';
    }
    if (!obs && field['groupId']) {
      parentField = allFormFields.find(f => f.id == field['groupId']);
      obsGroup = findObsByFormField(encounter.obs, assignedObsIds, parentField);
      if (obsGroup) {
        assignedObsIds.push(obsGroup.uuid);
        parentField.value = obsGroup;
        if (obsGroup.groupMembers) {
          obs = findObsByFormField(obsGroup.groupMembers, assignedObsIds, field);
        }
      }
    }
    if (obs) {
      assignedObsIds.push(obs.uuid);
      if (typeof obs.value == 'string' || typeof obs.value == 'number') {
        if (rendering == 'date' || rendering == 'datetime') {
          const dateObj = parseToLocalDateTime(`${obs.value}`);
          return { value: dateObj, display: moment(dateObj).format('YYYY-MM-DD HH:mm') };
        }
        return { value: obs.value, display: obs.value };
      }
      return {
        value: obs.value?.uuid,
        display: field.questionOptions.answers.find(option => option.concept == obs.value?.uuid)?.label,
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
    person: context.patient.id,
    obsDatetime: context.date,
    concept: field.questionOptions.concept,
    location: context.location,
    order: null,
    groupMembers: [],
    voided: false,
    formFieldNamespace: 'ohri-forms',
    formFieldPath: `ohri-forms-${field.id}`,
    value: value,
  };
};

export const findObsByFormField = (
  obsList: Array<OpenmrsObs>,
  claimedObsIds: string[],
  field: OHRIFormField,
): OpenmrsObs => {
  const obs = obsList.find(o => o.formFieldPath == `ohri-forms-${field.id}`);
  // We shall fall back to mapping by the associated concept
  // That being said, we shall find all matching obs and pick the one that wasn't previously claimed.
  if (!obs) {
    const assignableObsOptions = obsList.filter(obs => obs.concept.uuid == field.questionOptions.concept);
    // return the first occurrance of an unclaimed observation
    return assignableObsOptions.filter(obs => !claimedObsIds.includes(obs.uuid))[0];
  }
  return obs;
};

const multiSelectObsHandler = (field: OHRIFormField, values: Array<string>, context: EncounterContext) => {
  if (!field.value) {
    field.value = [];
  }
  values.forEach(value => {
    const obs = field.value.find(o => {
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

  // void or remove unchecked options
  field.questionOptions.answers
    .filter(opt => !values.some(v => v == opt.concept))
    .forEach(opt => {
      const observations = field.value.filter(o => {
        if (typeof o.value == 'string') {
          return o.value == opt.concept;
        }
        return o.value.uuid == opt.concept;
      });
      if (!observations.length) {
        return;
      }
      observations.forEach(obs => {
        if (context.sessionMode == 'edit' && obs.uuid) {
          obs.voided = true;
        } else {
          field.value = field.value.filter(o => o.value !== opt.concept);
        }
      });
    });
  return field.value;
};

export function teardownBaseHandlerUtils() {
  assignedObsIds = [];
}
