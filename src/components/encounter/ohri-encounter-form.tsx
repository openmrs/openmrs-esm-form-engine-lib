import { openmrsObservableFetch, useLayoutType } from '@openmrs/esm-framework';
import React, { useCallback, useEffect, useState } from 'react';
import { ConceptFalse, ConceptTrue, encounterRepresentation } from '../../constants';
import { OHRIFormContext } from '../../ohri-form-context';
import { getHandler, getValidator } from '../../registry/registry';
import {
  EncounterDescriptor,
  OHRIFormField,
  OHRIFormPage as OHRIFormPageProps,
  OHRIFormSchema,
  SessionMode,
} from '../../api/types';
import {
  cascadeVisibityToChildFields,
  evaluateFieldReadonlyProp,
  inferInitialValueFromDefaultFieldValue,
  voidObsValueOnFieldHidden,
} from '../../utils/ohri-form-helper';
import { isEmpty, isEmpty as isValueEmpty, OHRIFieldValidator } from '../../validators/ohri-form-validator';
import OHRIFormPage from '../page/ohri-form-page';
import { InstantEffect } from '../../utils/instant-effect';
import { FormSubmissionHandler } from '../../ohri-form.component';
import { isTrue } from '../../utils/boolean-utils';
import { evaluateExpression } from '../../utils/expression-runner';
import { getPreviousEncounter, saveEncounter } from '../../api/api';

interface OHRIEncounterFormProps {
  formJson: OHRIFormSchema;
  patient: any;
  encounterDate: Date;
  provider: string;
  location: { uuid: string; name: string };
  values: Record<string, any>;
  isCollapsed: boolean;
  sessionMode: SessionMode;
  scrollablePages: Set<OHRIFormPageProps>;
  handlers: Map<string, FormSubmissionHandler>;
  allInitialValues: Record<string, any>;
  workspaceLayout: 'minimized' | 'maximized';
  setAllInitialValues: (values: Record<string, any>) => void;
  setScrollablePages: (pages: Set<OHRIFormPageProps>) => void;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  setSelectedPage: (page: string) => void;
}

export const OHRIEncounterForm: React.FC<OHRIEncounterFormProps> = ({
  formJson,
  patient,
  encounterDate,
  provider,
  location,
  values,
  isCollapsed,
  sessionMode,
  scrollablePages,
  workspaceLayout,
  setScrollablePages,
  setFieldValue,
  setSelectedPage,
  handlers,
  allInitialValues,
  setAllInitialValues,
}) => {
  const [fields, setFields] = useState<Array<OHRIFormField>>([]);
  const [encounterLocation, setEncounterLocation] = useState(null);
  const [encounter, setEncounter] = useState<EncounterDescriptor>(null);
  const [previousEncounter, setPreviousEncounter] = useState<EncounterDescriptor>(null);
  const [form, setForm] = useState<OHRIFormSchema>(formJson);
  const [obsGroupsToVoid, setObsGroupsToVoid] = useState([]);
  const [formInitialValues, setFormInitialValues] = useState({});
  const [isFieldInitializationComplete, setIsFieldInitializationComplete] = useState(false);
  const layoutType = useLayoutType();

  const addScrollablePages = useCallback(() => {
    formJson.pages.forEach(page => {
      if (!page.isSubform) {
        scrollablePages.add(page);
      }
    });
    return () => {
      formJson.pages.forEach(page => {
        if (!page.isSubform) {
          scrollablePages.delete(page);
        }
      });
    };
  }, [scrollablePages, formJson]);

  const encounterContext = {
    patient: patient,
    encounter: encounter,
    previousEncounter,
    location: location,
    sessionMode: sessionMode || (form?.encounter ? 'edit' : 'enter'),
    date: encounterDate,
  };

  useEffect(() => {
    if (!encounterLocation) {
      setEncounterLocation(location);
    }
  }, [location]);

  useEffect(() => {
    const allFormFields: Array<OHRIFormField> = [];
    const tempInitVals = {};
    let isFieldEncounterBindingComplete = false;
    form.pages.forEach(page =>
      page.sections.forEach(section => {
        section.questions.forEach(question => {
          // explicitly set blank values to null
          // TODO: shouldn't we be setting to the default behaviour?
          section.inlineRendering = isEmpty(section.inlineRendering) ? null : section.inlineRendering;
          page.inlineRendering = isEmpty(page.inlineRendering) ? null : page.inlineRendering;
          form.inlineRendering = isEmpty(form.inlineRendering) ? null : form.inlineRendering;
          question.inlineRendering = section.inlineRendering ?? page.inlineRendering ?? form.inlineRendering;
          evaluateFieldReadonlyProp(question, section.readonly, page.readonly, form.readonly);
          if (question.questionOptions.rendering == 'fixed-value' && !question['fixedValue']) {
            question['fixedValue'] = question.value;
          }
          allFormFields.push(question);
          if (question.type == 'obsGroup') {
            question.questions.forEach(groupedField => {
              // set group id
              groupedField['groupId'] = question.id;
              allFormFields.push(groupedField);
            });
          }
        });
      }),
    );
    // set Formik initial values
    if (encounter) {
      allFormFields.forEach(field => {
        const handler = getHandler(field.type);
        let existingVal = handler?.getInitialValue(encounter, field, allFormFields);
        if (isEmpty(existingVal) && !isEmpty(field.questionOptions.defaultValue)) {
          existingVal = inferInitialValueFromDefaultFieldValue(field, encounterContext, handler);
        }
        tempInitVals[field.id] = existingVal === null || existingVal === undefined ? '' : existingVal;
        if (field.unspecified) {
          tempInitVals[`${field.id}-unspecified`] = !!!existingVal;
        }
      });
      setEncounterLocation(encounter.location);
      isFieldEncounterBindingComplete = true;
    } else {
      const emptyValues = {
        checkbox: [],
        toggle: false,
        default: '',
      };
      allFormFields.forEach(field => {
        let value = null;
        if (!isEmpty(field.questionOptions.defaultValue)) {
          value = inferInitialValueFromDefaultFieldValue(field, encounterContext, getHandler(field.type));
        }
        if (!isEmpty(value)) {
          tempInitVals[field.id] = value;
        } else {
          tempInitVals[field.id] =
            emptyValues[field.questionOptions.rendering] != undefined
              ? emptyValues[field.questionOptions.rendering]
              : emptyValues.default;
        }
        if (field.unspecified) {
          tempInitVals[`${field.id}-unspecified`] = false;
        }
      });
    }
    // prepare fields
    setFields(
      allFormFields.map(field => {
        if (field.hide) {
          evalHide({ value: field, type: 'field' }, allFormFields, tempInitVals);
        } else {
          field.isHidden = false;
        }
        if (typeof field.readonly == 'string' && field.readonly?.split(' ')?.length > 1) {
          // needed to store the expression for further evaluations
          field['readonlyExpression'] = field.readonly;
          field.readonly = evaluateExpression(
            field.readonly,
            { value: field, type: 'field' },
            allFormFields,
            tempInitVals,
            {
              mode: sessionMode,
              patient,
            },
          );
        }
        return field;
      }),
    );
    form.pages.forEach(page => {
      if (page.hide) {
        evalHide({ value: page, type: 'page' }, allFormFields, tempInitVals);
      } else {
        page.isHidden = false;
      }
      page.sections.forEach(section => {
        if (section.hide) {
          evalHide({ value: section, type: 'section' }, allFormFields, tempInitVals);
        } else {
          section.isHidden = false;
        }
      });
    });
    setForm(form);
    setFormInitialValues(tempInitVals);
    setAllInitialValues({ ...allInitialValues, ...tempInitVals });
    if (sessionMode == 'enter') {
      setIsFieldInitializationComplete(true);
    } else if (isFieldEncounterBindingComplete) {
      setIsFieldInitializationComplete(true);
    }
  }, [encounter]);

  useEffect(() => {
    let subscription;
    if (formJson.encounter && typeof formJson.encounter == 'string') {
      subscription = openmrsObservableFetch<EncounterDescriptor>(
        `/ws/rest/v1/encounter/${formJson.encounter}?v=${encounterRepresentation}`,
      ).subscribe(({ data }) => setEncounter(data));
    } else if (typeof formJson.encounter == 'object') {
      setEncounter(formJson.encounter);
    }
    return () => subscription?.unsubscribe();
  }, [formJson.encounter]);

  useEffect(() => {
    if (sessionMode == 'enter') {
      getPreviousEncounter(patient.id, formJson.encounterType).then(data => {
        setPreviousEncounter(data);
      });
    }
  }, [sessionMode]);

  const evalHide = (node, allFields: OHRIFormField[], allValues: Record<string, any>) => {
    const { value, type } = node;
    const isHidden = evaluateExpression(value['hide']?.hideWhenExpression, node, allFields, allValues, {
      mode: sessionMode,
      patient,
    });
    node.value.isHidden = isHidden;
    // cascade visibility
    if (type == 'page') {
      value['sections'].forEach(section => {
        section.isParentHidden = isHidden;
        cascadeVisibityToChildFields(isHidden, section, allFields, obsGroupsToVoid, setFieldValue);
      });
    }
    if (type == 'section') {
      cascadeVisibityToChildFields(isHidden, value, allFields, obsGroupsToVoid, setFieldValue);
    }
  };

  const addObs = useCallback((obsList: Array<any>, obs: any) => {
    if (Array.isArray(obs)) {
      obs.forEach(o => {
        delete o.formFieldNamespace;
        delete o.formFieldPath;
        if (isValueEmpty(o.groupMembers)) {
          delete o.groupMembers;
        } else {
          o.groupMembers.forEach(obsChild => {
            delete obsChild.formFieldNamespace;
            delete obsChild.formFieldPath;
            if (isValueEmpty(obsChild.groupMembers)) {
              delete obsChild.groupMembers;
            }
          });
        }
        obsList.push(o);
      });
    } else {
      delete obs.formFieldNamespace;
      delete obs.formFieldPath;
      if (isValueEmpty(obs.groupMembers)) {
        delete obs.groupMembers;
      } else {
        obs.groupMembers.forEach(obsChild => {
          delete obsChild.formFieldNamespace;
          delete obsChild.formFieldPath;
          if (isValueEmpty(obsChild.groupMembers)) {
            delete obsChild.groupMembers;
          }
        });
      }
      obsList.push(obs);
    }
  }, []);

  const validate = useCallback(
    values => {
      let formHasErrors = false;
      // handle field validation
      fields
        .filter(field => !field.isParentHidden && !field.disabled && !field.isHidden && !isTrue(field.readonly))
        .filter(field => field['submission']?.unspecified != true)
        .forEach(field => {
          const errors = OHRIFieldValidator.validate(field, values[field.id]);
          if (errors.length) {
            field['submission'] = {
              ...field['submission'],
              errors: errors,
            };
            formHasErrors = true;
            return;
          }
        });
      return !formHasErrors;
    },
    [fields],
  );

  const handleFormSubmit = (values: Record<string, any>) => {
    const obsForSubmission = [];
    fields
      .filter(field => field.value || field.type == 'obsGroup') // filter out fields with empty values except groups
      .filter(field => !field.isParentHidden && !field.isHidden && (field.type == 'obs' || field.type == 'obsGroup'))
      .filter(field => !field['groupId']) // filter out grouped obs
      .forEach(field => {
        if (field.type == 'obsGroup') {
          const obsGroup = {
            person: patient.id,
            obsDatetime: encounterDate,
            concept: field.questionOptions.concept,
            location: encounterLocation,
            order: null,
            groupMembers: [],
            uuid: field?.value?.uuid,
            voided: false,
          };
          let hasValue = false;
          field.questions.forEach(groupedField => {
            if (groupedField.value) {
              hasValue = true;
              if (Array.isArray(groupedField.value)) {
                obsGroup.groupMembers.push(...groupedField.value);
              } else {
                obsGroup.groupMembers.push(groupedField.value);
              }
            }
          });
          hasValue && addObs(obsForSubmission, obsGroup);
        } else {
          addObs(obsForSubmission, field.value);
        }
      });

    // Add voided obs groups
    obsGroupsToVoid.forEach(obs => addObs(obsForSubmission, obs));
    let encounterForSubmission: EncounterDescriptor = {};
    if (encounter) {
      Object.assign(encounterForSubmission, encounter);
      encounterForSubmission['location'] = encounterLocation.uuid;
      // update encounter providers
      const hasCurrentProvider =
        encounterForSubmission['encounterProviders'].findIndex(encProvider => encProvider.provider.uuid == provider) !==
        -1;
      if (!hasCurrentProvider) {
        encounterForSubmission['encounterProviders'] = [
          ...encounterForSubmission.encounterProviders,
          {
            provider: provider,
            encounterRole: '240b26f9-dd88-4172-823d-4a8bfeb7841f',
          },
        ];
      }
      encounterForSubmission['obs'] = obsForSubmission;
    } else {
      encounterForSubmission = {
        patient: patient.id,
        encounterDatetime: encounterDate,
        location: encounterLocation.uuid,
        encounterType: formJson.encounterType,
        encounterProviders: [
          {
            provider: provider,
            encounterRole: '240b26f9-dd88-4172-823d-4a8bfeb7841f',
          },
        ],
        obs: obsForSubmission,
      };
    }
    if (encounterForSubmission.obs?.length || encounterForSubmission.orders?.length) {
      const ac = new AbortController();
      return saveEncounter(ac, encounterForSubmission, encounter?.uuid);
    }
  };

  const onFieldChange = (fieldName: string, value: any, setErrors) => {
    const field = fields.find(field => field.id == fieldName);
    const validators = Array.isArray(field.validators)
      ? [{ type: 'OHRIBaseValidator' }, ...field.validators]
      : [{ type: 'OHRIBaseValidator' }];
    if (Array.isArray(field.validators)) {
    }
    // handle validation
    const basevalidatorConfig = {
      expressionContext: { mode: sessionMode },
      values: { ...values, [fieldName]: value },
      fields,
    };
    for (let validatorConfig of validators) {
      const errors =
        getValidator(validatorConfig.type)?.validate(field, value, { ...basevalidatorConfig, ...validatorConfig }) ||
        [];
      setErrors && setErrors(errors);
      if (errors.length) {
        return;
      }
    }
    if (field.questionOptions.rendering == 'toggle') {
      value = value ? ConceptTrue : ConceptFalse;
    }
    if (field.fieldDependants) {
      field.fieldDependants.forEach(dep => {
        const dependant = fields.find(f => f.id == dep);
        evalHide({ value: dependant, type: 'field' }, fields, { ...values, [fieldName]: value });
        voidObsValueOnFieldHidden(dependant, obsGroupsToVoid, setFieldValue);
        if (dependant['readonlyExpression']) {
          dependant.readonly = evaluateExpression(
            dependant['readonlyExpression'],
            { value: dependant, type: 'field' },
            fields,
            { ...values, [fieldName]: value },
            {
              mode: sessionMode,
              patient,
            },
          );
        }
        let fields_temp = [...fields];
        const index = fields_temp.findIndex(f => f.id == dep);
        fields_temp[index] = dependant;
        setFields(fields_temp);
      });
    }
    if (field.sectionDependants) {
      field.sectionDependants.forEach(dependant => {
        for (let i = 0; i < form.pages.length; i++) {
          const section = form.pages[i].sections.find((section, _sectionIndex) => section.label == dependant);
          if (section) {
            evalHide({ value: section, type: 'section' }, fields, { ...values, [fieldName]: value });
            break;
          }
        }
      });
    }
    if (field.pageDependants) {
      field.pageDependants?.forEach(dep => {
        const dependant = form.pages.find(f => f.label == dep);
        evalHide({ value: dependant, type: 'page' }, fields, { ...values, [fieldName]: value });
        let form_temp = form;
        const index = form_temp.pages.findIndex(page => page.label == dep);
        form_temp[index] = dependant;
        setForm(form_temp);
      });
    }
  };

  // set handler
  handlers.set(form.name, { validate: validate, submit: handleFormSubmit });

  return (
    <OHRIFormContext.Provider
      value={{
        values: values,
        setFieldValue: setFieldValue,
        setEncounterLocation: setEncounterLocation,
        setObsGroupsToVoid: setObsGroupsToVoid,
        obsGroupsToVoid: obsGroupsToVoid,
        fields: fields,
        encounterContext,
        layoutType,
        workspaceLayout,
        isFieldInitializationComplete,
      }}>
      <InstantEffect effect={addScrollablePages} />
      {form.pages.map((page, index) => {
        if (isTrue(page.isHidden)) {
          return null;
        }
        if (isTrue(page.isSubform) && page.subform?.form) {
          if (sessionMode != 'enter' && !page.subform?.form.encounter) {
            return null;
          }
          // filter out all nested subforms
          page.subform.form.pages = page.subform.form.pages.filter(page => !isTrue(page.isSubform));
          return (
            <OHRIEncounterForm
              key={index}
              formJson={page.subform?.form}
              patient={patient}
              encounterDate={encounterDate}
              provider={provider}
              location={location}
              values={values}
              isCollapsed={isCollapsed}
              sessionMode={sessionMode}
              scrollablePages={scrollablePages}
              setAllInitialValues={setAllInitialValues}
              allInitialValues={allInitialValues}
              setScrollablePages={setScrollablePages}
              setFieldValue={setFieldValue}
              setSelectedPage={setSelectedPage}
              handlers={handlers}
              workspaceLayout={workspaceLayout}
            />
          );
        }
        return (
          <OHRIFormPage
            page={page}
            onFieldChange={onFieldChange}
            setSelectedPage={setSelectedPage}
            isCollapsed={isCollapsed}
          />
        );
      })}
    </OHRIFormContext.Provider>
  );
};
