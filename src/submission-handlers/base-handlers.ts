import moment from 'moment';
import { getConcept } from '../api/api';
import { ConceptTrue } from '../constants';
import { EncounterContext } from '../ohri-form-context';
import { OHRIFormField, SubmissionHandler } from '../api/types';

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
        if (field.questionOptions.rendering == 'date') {
          field.value.value = moment(value).format('YYYY-MM-DD HH:mm');
        } else {
          field.value.value = value;
        }
        field.value.voided = false;
      }
    } else {
      if (field.questionOptions.rendering == 'date') {
        field.value = constructObs(moment(value).format('YYYY-MM-DD HH:mm'), context, field);
        return field.value;
      }
      field.value = constructObs(value, context, field);
    }
    return field.value;
  },
  getInitialValue: (encounter: any, field: OHRIFormField, allFormFields: Array<OHRIFormField>) => {
    let obs = getEncounterObs(encounter, field);
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
      obsGroup = getEncounterObs(encounter, parentField);
      if (obsGroup) {
        parentField.value = obsGroup;
        if (obsGroup.groupMembers) {
          obs = getEncounterObs(obsGroup.groupMembers, field);
        }
      }
    }
    if (obs) {
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
        if (field.questionOptions.rendering == 'date') {
          field.value.value = moment(field.value.value).format('YYYY-MM-DD HH:mm');
          return moment(obs.value).toDate();
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
  getPreviousValue: (field: OHRIFormField, encounter: any, allFormFields: Array<OHRIFormField>) => {
    let obs = getEncounterObs(encounter, field);
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
      obsGroup = getEncounterObs(encounter, parentField);
      if (obsGroup) {
        parentField.value = obsGroup;
        if (obsGroup.groupMembers) {
          obs = getEncounterObs(obsGroup.groupMembers, field);
        }
      }
    }
    if (obs) {
      if (typeof obs.value == 'string' || typeof obs.value == 'number') {
        if (rendering == 'date') {
          return { value: moment(obs.value).toDate(), display: moment(obs.value).format('YYYY-MM-DD HH:mm') };
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
    formFieldPath: constructFormFieldPath(field.id),
    value: value,
  };
};

const constructFormFieldPath = (id: string): string => {
  return `ohri-forms-${id}`;
};

export const getEncounterObs = (encounter: any, field: OHRIFormField) => {
  let obs = encounter.obs.find(o => o.formFieldPath == constructFormFieldPath(field.id));
  if (!obs) {
    obs = encounter.obs.find(o => o.concept.uuid == field.questionOptions.concept && !o.formFieldPath);
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
