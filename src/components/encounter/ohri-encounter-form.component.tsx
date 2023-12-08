import React, { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { SessionLocation, showToast, useLayoutType, Visit } from '@openmrs/esm-framework';
import { ConceptFalse, ConceptTrue } from '../../constants';
import {
  OHRIFormField,
  OHRIFormPage as OHRIFormPageProps,
  OHRIFormSchema,
  OpenmrsEncounter,
  SessionMode,
  ValidationResult,
  RepeatObsGroupCounter,
} from '../../api/types';
import OHRIFormPage from '../page/ohri-form-page';
import { OHRIFormContext } from '../../ohri-form-context';
import {
  cascadeVisibityToChildFields,
  evaluateFieldReadonlyProp,
  findConceptByReference,
  findPagesWithErrors,
  voidObsValueOnFieldHidden,
} from '../../utils/ohri-form-helper';
import { isEmpty, isEmpty as isValueEmpty, OHRIFieldValidator } from '../../validators/ohri-form-validator';
import { InstantEffect } from '../../utils/instant-effect';
import { FormSubmissionHandler } from '../../ohri-form.component';
import { evaluateAsyncExpression, evaluateExpression } from '../../utils/expression-runner';
import { getPreviousEncounter, saveAttachment, saveEncounter } from '../../api/api';
import { isTrue } from '../../utils/boolean-utils';
import { scrollIntoView } from '../../utils/ohri-sidebar';
import { useEncounter } from '../../hooks/useEncounter';
import { useInitialValues } from '../../hooks/useInitialValues';
import { useEncounterRole } from '../../hooks/useEncounterRole';
import { useConcepts } from '../../hooks/useConcepts';
import { useFormFieldHandlers } from '../../hooks/useFormFieldHandlers';
import { useFormFieldValidators } from '../../hooks/useFormFieldValidators';

interface OHRIEncounterFormProps {
  formJson: OHRIFormSchema;
  patient: any;
  formSessionDate: Date;
  provider: string;
  location: SessionLocation;
  visit?: Visit;
  values: Record<string, any>;
  isFormExpanded: boolean;
  sessionMode: SessionMode;
  scrollablePages: Set<OHRIFormPageProps>;
  handlers: Map<string, FormSubmissionHandler>;
  allInitialValues: Record<string, any>;
  workspaceLayout: 'minimized' | 'maximized';
  setAllInitialValues: (values: Record<string, any>) => void;
  setScrollablePages: (pages: Set<OHRIFormPageProps>) => void;
  setPagesWithErrors: (pages: string[]) => void;
  setIsLoadingFormDependencies?: (value: boolean) => void;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  setSelectedPage: (page: string) => void;
  isSubmitting: boolean;
  setIsSubmitting?: Dispatch<SetStateAction<boolean>>;
}

export const OHRIEncounterForm: React.FC<OHRIEncounterFormProps> = ({
  formJson,
  patient,
  formSessionDate,
  provider,
  location,
  visit,
  values,
  isFormExpanded,
  sessionMode,
  scrollablePages,
  workspaceLayout,
  setScrollablePages,
  setPagesWithErrors,
  setIsLoadingFormDependencies,
  setFieldValue,
  setSelectedPage,
  handlers,
  allInitialValues,
  setAllInitialValues,
  isSubmitting,
  setIsSubmitting,
}) => {
  const [fields, setFields] = useState<Array<OHRIFormField>>([]);
  const [encounterLocation, setEncounterLocation] = useState(null);
  const [encounterDate, setEncounterDate] = useState(formSessionDate);
  const { encounter, isLoading: isLoadingEncounter } = useEncounter(formJson);
  const [previousEncounter, setPreviousEncounter] = useState<OpenmrsEncounter>(null);
  const [isLoadingPreviousEncounter, setIsLoadingPreviousEncounter] = useState(true);
  const [form, setForm] = useState<OHRIFormSchema>(formJson);
  const [obsGroupsToVoid, setObsGroupsToVoid] = useState([]);
  const [isFieldInitializationComplete, setIsFieldInitializationComplete] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);
  const [initValues, setInitValues] = useState({});
  const [obsGroupCounter, setObsGroupCounter] = useState<Array<RepeatObsGroupCounter | null>>([]);
  const layoutType = useLayoutType();

  const encounterContext = useMemo(
    () => ({
      patient: patient,
      encounter: encounter,
      previousEncounter,
      location: location,
      sessionMode: sessionMode || (form?.encounter ? 'edit' : 'enter'),
      encounterDate: formSessionDate,
      form: form,
      visit: visit,
      setEncounterDate,
      initValues: initValues,
      obsGroupCounter: obsGroupCounter,
      setObsGroupCounter: setObsGroupCounter,
    }),
    [encounter, form?.encounter, location, patient, previousEncounter, sessionMode, initValues],
  );
  const { encounterRole } = useEncounterRole();

  // given the form, flatten the fields and pull out all concept references
  const [flattenedFields, conceptReferences] = useMemo(() => {
    const flattenedFieldsTemp = [];
    const conceptReferencesTemp = new Set<string>();
    form.pages?.forEach((page) =>
      page.sections?.forEach((section) => {
        section.questions?.forEach((question) => {
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
          flattenedFieldsTemp.push(question);
          if (question.type == 'obsGroup') {
            question.questions.forEach((groupedField) => {
              if (groupedField.questionOptions.rendering == 'fixed-value' && !groupedField['fixedValue']) {
                groupedField['fixedValue'] = groupedField.value;
              }
              // set group id
              groupedField['groupId'] = question.id;
              flattenedFieldsTemp.push(groupedField);
            });
          }
        });
      }),
    );
    flattenedFieldsTemp.forEach((field) => {
      if (field.questionOptions?.concept) {
        conceptReferencesTemp.add(field.questionOptions.concept);
      }
      if (field.questionOptions?.answers) {
        field.questionOptions.answers.forEach((answer) => {
          if (answer.concept) {
            conceptReferencesTemp.add(answer.concept);
          }
        });
      }
    });
    return [flattenedFieldsTemp, conceptReferencesTemp];
  }, []);

  const formFieldHandlers = useFormFieldHandlers(flattenedFields);
  const formFieldValidators = useFormFieldValidators(flattenedFields);
  const { initialValues: tempInitialValues, isBindingComplete } = useInitialValues(
    flattenedFields,
    encounter,
    encounterContext,
    formFieldHandlers,
  );

  useEffect(() => {
    if (tempInitialValues) {
      setInitValues(tempInitialValues);
    }
  }, [tempInitialValues]);

  // look up concepts via their references
  const { concepts, isLoading: isLoadingConcepts } = useConcepts(conceptReferences);

  const addScrollablePages = useCallback(() => {
    formJson.pages.forEach((page) => {
      if (!page.isSubform) {
        scrollablePages.add(page);
      }
    });
    return () => {
      formJson.pages.forEach((page) => {
        if (!page.isSubform) {
          scrollablePages.delete(page);
        }
      });
    };
  }, [scrollablePages, formJson]);

  useEffect(() => {
    if (!encounterLocation && location) {
      setEncounterLocation(location);
    }
    if (encounter && !encounterLocation) {
      setEncounterLocation(encounter.location);
    }
  }, [location, encounter]);

  useEffect(() => {
    if (Object.keys(tempInitialValues ?? {}).length && !isFieldInitializationComplete) {
      setFields(
        flattenedFields.map((field) => {
          if (field.hide) {
            evalHide({ value: field, type: 'field' }, flattenedFields, tempInitialValues);
          } else {
            field.isHidden = false;
          }
          field.questionOptions.answers
            ?.filter((answer) => !isEmpty(answer.hide?.hideWhenExpression))
            .forEach((answer) => {
              answer.isHidden = evaluateExpression(
                answer.hide.hideWhenExpression,
                { value: field, type: 'field' },
                flattenedFields,
                tempInitialValues,
                {
                  mode: sessionMode,
                  patient,
                },
              );
            });
          if (typeof field.readonly == 'string' && field.readonly?.split(' ')?.length > 1) {
            // needed to store the expression for further evaluations
            field['readonlyExpression'] = field.readonly;
            field.readonly = evaluateExpression(
              field.readonly,
              { value: field, type: 'field' },
              flattenedFields,
              tempInitialValues,
              {
                mode: sessionMode,
                patient,
              },
            );
          }
          const limitExpression = field.questionOptions.repeatOptions?.limitExpression;
          if (field.questionOptions.rendering === 'repeating' && !isEmpty(limitExpression)) {
            field.questionOptions.repeatOptions.limit = evaluateExpression(
              limitExpression,
              { value: field, type: 'field' },
              flattenedFields,
              tempInitialValues,
              {
                mode: sessionMode,
                patient,
              },
            );
          }

          // for each question and answer, see if we find a matching concept, and, if so:
          //   1) replace the concept reference with uuid (for the case when the form references the concept by mapping)
          //   2) use the concept display as the label if no label specified
          const matchingConcept = findConceptByReference(field.questionOptions.concept, concepts);
          field.questionOptions.concept = matchingConcept ? matchingConcept.uuid : field.questionOptions.concept;
          field.label = field.label ? field.label : matchingConcept?.display;
          if (field.questionOptions.answers) {
            field.questionOptions.answers = field.questionOptions.answers.map((answer) => {
              const matchingAnswerConcept = findConceptByReference(answer.concept, concepts);
              return {
                ...answer,
                concept: matchingAnswerConcept ? matchingAnswerConcept.uuid : answer.concept,
                label: answer.label ? answer.label : matchingAnswerConcept?.display,
              };
            });
          }

          return field;
        }),
      );

      form?.pages?.forEach((page) => {
        if (page.hide) {
          evalHide({ value: page, type: 'page' }, flattenedFields, tempInitialValues);
        } else {
          page.isHidden = false;
        }
        page?.sections?.forEach((section) => {
          if (section.hide) {
            evalHide({ value: section, type: 'section' }, flattenedFields, tempInitialValues);
          } else {
            section.isHidden = false;
          }
        });
      });
      setForm(form);
      setAllInitialValues({ ...allInitialValues, ...values, ...tempInitialValues });
      if (isBindingComplete && !isLoadingConcepts) {
        setIsFieldInitializationComplete(true);
      }
    }
  }, [tempInitialValues, concepts, isLoadingConcepts, isBindingComplete]);

  useEffect(() => {
    if (sessionMode == 'enter' && !isTrue(formJson.formOptions?.usePreviousValueDisabled)) {
      getPreviousEncounter(patient?.id, formJson?.encounterType).then((data) => {
        setPreviousEncounter(data);
        setIsLoadingPreviousEncounter(false);
      });
    } else {
      setIsLoadingPreviousEncounter(false);
    }
  }, [sessionMode]);

  useEffect(() => {
    if (!isLoadingEncounter && !isLoadingPreviousEncounter) {
      setIsLoadingFormDependencies(false);
    }
  }, [isLoadingEncounter, isLoadingPreviousEncounter]);

  const evalHide = (node, allFields: OHRIFormField[], allValues: Record<string, any>) => {
    const { value, type } = node;
    const isHidden = evaluateExpression(value['hide']?.hideWhenExpression, node, allFields, allValues, {
      mode: sessionMode,
      patient,
    });
    node.value.isHidden = isHidden;
    if (type == 'field' && node.value?.questions?.length) {
      node.value?.questions.forEach((question) => {
        question.isParentHidden = isHidden;
      });
    }
    // cascade visibility
    if (type == 'page') {
      value['sections'].forEach((section) => {
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
      obs.forEach((o) => {
        if (isValueEmpty(o.groupMembers)) {
          delete o.groupMembers;
        } else {
          o.groupMembers.forEach((obsChild) => {
            if (isValueEmpty(obsChild.groupMembers)) {
              delete obsChild.groupMembers;
            }
          });
        }
        obsList.push(o);
      });
    } else {
      if (isValueEmpty(obs.groupMembers)) {
        delete obs.groupMembers;
      } else {
        obs.groupMembers.forEach((obsChild) => {
          if (isValueEmpty(obsChild.groupMembers)) {
            delete obsChild.groupMembers;
          }
        });
      }
      obsList.push(obs);
    }
  }, []);

  useEffect(() => {
    if (invalidFields?.length) {
      setPagesWithErrors(findPagesWithErrors(scrollablePages, invalidFields));

      switch (invalidFields[0].questionOptions.rendering) {
        case 'date':
          scrollIntoView(invalidFields[0].id, false);
          break;
        case 'radio':
          const firstRadioGroupMemberDomId = `${invalidFields[0].id}-${invalidFields[0].questionOptions.answers[0].label}`;
          scrollIntoView(firstRadioGroupMemberDomId, true);
          break;
        case 'checkbox':
          scrollIntoView(`${invalidFields[0].label}-input`, true);
          break;
        default:
          scrollIntoView(invalidFields[0].id, true);
          break;
      }
    } else {
      // clear errrors
      setPagesWithErrors([]);
    }
  }, [invalidFields]);

  const validate = useCallback(
    (values) => {
      let errorFields = [];
      let formHasErrors = false;
      // handle field validation
      fields
        .filter((field) => !field.isParentHidden && !field.disabled && !field.isHidden && !isTrue(field.readonly))
        .filter((field) => field['submission']?.unspecified != true)
        .forEach((field) => {
          const errors =
            OHRIFieldValidator.validate(field, values[field.id]).filter((error) => error.resultType == 'error') ?? [];
          if (errors.length) {
            errorFields.push(field);
            field['submission'] = {
              ...field['submission'],
              errors: errors,
            };
            formHasErrors = true;
            return;
          }
        });
      setInvalidFields([...errorFields]);

      return !formHasErrors;
    },
    [fields],
  );

  const handleFormSubmit = (values: Record<string, any>) => {
    const obsForSubmission = [];
    fields
      .filter((field) => field.value || field.type == 'obsGroup') // filter out fields with empty values except groups
      .filter((field) => !field.isParentHidden && !field.isHidden && (field.type == 'obs' || field.type == 'obsGroup'))
      .filter((field) => !field['groupId']) // filter out grouped obs
      .filter((field) => !field.questionOptions.isTransient && field.questionOptions.rendering !== 'file')
      .forEach((field) => {
        if (field.type == 'obsGroup') {
          const obsGroup = {
            person: patient?.id,
            obsDatetime: encounterDate,
            concept: field.questionOptions.concept,
            location: encounterLocation,
            order: null,
            groupMembers: [],
            uuid: field.uuid,
            voided: false,
          };

          //validate obs group count against limit
          const limit = field.questionOptions.repeatOptions?.limit;
          const counter = obsGroupCounter?.filter((eachItem) => eachItem.fieldId === field.id)[0]?.obsGroupCount;

          if (limit && counter && counter !== Number(limit)) {
            setIsSubmitting(false);
            showToast({
              description: 'obsGroup count does not match limit specified',
              title: 'Invalid entry',
              kind: 'error',
              critical: true,
            });
            throw new Error('obsGroup count does not match limit specified');
          }

          let hasValue = false;
          field.questions.forEach((groupedField) => {
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
    obsGroupsToVoid.forEach((obs) => addObs(obsForSubmission, obs));
    let encounterForSubmission: OpenmrsEncounter = {};
    if (encounter) {
      Object.assign(encounterForSubmission, encounter);
      encounterForSubmission['location'] = encounterLocation.uuid;
      // update encounter providers
      const hasCurrentProvider =
        encounterForSubmission['encounterProviders'].findIndex(
          (encProvider) => encProvider.provider.uuid == provider,
        ) !== -1;
      if (!hasCurrentProvider) {
        encounterForSubmission['encounterProviders'] = [
          ...encounterForSubmission.encounterProviders,
          {
            provider: provider,
            encounterRole: encounterRole?.uuid,
          },
        ];
        (encounterForSubmission['form'] = {
          uuid: encounterContext?.form?.uuid,
        }),
          (encounterForSubmission['visit'] = {
            uuid: visit?.uuid,
          });
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
            encounterRole: encounterRole?.uuid,
          },
        ],
        obs: obsForSubmission,
        form: {
          uuid: encounterContext?.form?.uuid,
        },
        visit: visit?.uuid,
      };
    }

    if (encounterForSubmission.obs?.length || encounterForSubmission.orders?.length) {
      const ac = new AbortController();
      return saveEncounter(ac, encounterForSubmission, encounter?.uuid).then((response) => {
        const encounter = response.data;
        const fileFields = fields?.filter((field) => field?.questionOptions.rendering === 'file');
        const saveAttachmentPromises = fileFields.map((field) => {
          return saveAttachment(
            encounter?.patient.uuid,
            field,
            field?.questionOptions.concept,
            new Date().toISOString(),
            encounter?.uuid,
            ac,
          );
        });
        return Promise.all(saveAttachmentPromises).then(() => response);
      });
    }
  };

  const onFieldChange = (
    fieldName: string,
    value: any,
    setErrors: (errors: Array<ValidationResult>) => void,
    setWarnings: (warnings: Array<ValidationResult>) => void,
    isUnspecified: boolean,
  ) => {
    const field = fields.find((field) => field.id == fieldName);
    const validators = Array.isArray(field.validators)
      ? [{ type: 'default' }, ...field.validators]
      : [{ type: 'default' }];
    // handle validation
    const basevalidatorConfig = {
      expressionContext: { patient, mode: sessionMode },
      values: { ...values, [fieldName]: value },
      fields,
    };
    const errors = [];
    const warnings = [];
    if (!isUnspecified) {
      for (let validatorConfig of validators) {
        const errorsAndWarinings =
          formFieldValidators[validatorConfig.type].validate(field, value, {
            ...basevalidatorConfig,
            ...validatorConfig,
          }) || [];
        errors.push(...errorsAndWarinings.filter((error) => error.resultType == 'error'));
        warnings.push(...errorsAndWarinings.filter((error) => error.resultType == 'warning'));
      }
    }
    setErrors?.(errors);
    setWarnings?.(warnings);
    if (errors.length) {
      setInvalidFields((invalidFields) => [...invalidFields, field]);
    } else {
      setInvalidFields((invalidFields) => invalidFields.filter((item) => item !== field));
    }
    if (field.questionOptions.rendering == 'toggle') {
      value = value ? ConceptTrue : ConceptFalse;
    }
    if (field.fieldDependants) {
      field.fieldDependants.forEach((dep) => {
        const dependant = fields.find((f) => f.id == dep);
        // evaluate calculated value
        if (dependant.questionOptions.calculate?.calculateExpression) {
          evaluateAsyncExpression(
            dependant.questionOptions.calculate.calculateExpression,
            { value: dependant, type: 'field' },
            fields,
            { ...values, [fieldName]: value },
            {
              mode: sessionMode,
              patient,
            },
          ).then((result) => {
            result = isEmpty(result) ? '' : result;
            values[dependant.id] = result;
            setFieldValue(dependant.id, result);
            formFieldHandlers[dependant.type].handleFieldSubmission(dependant, result, encounterContext);
          });
        }
        // evaluate hide
        if (dependant.hide) {
          evalHide({ value: dependant, type: 'field' }, fields, { ...values, [fieldName]: value });
          voidObsValueOnFieldHidden(dependant, obsGroupsToVoid, setFieldValue);
        }
        dependant?.questionOptions.answers
          ?.filter((answer) => !isEmpty(answer.hide?.hideWhenExpression))
          .forEach((answer) => {
            answer.isHidden = evaluateExpression(
              answer.hide?.hideWhenExpression,
              { value: dependant, type: 'field' },
              fields,
              { ...values, [fieldName]: value },
              {
                mode: sessionMode,
                patient,
              },
            );
          });
        // evaluate readonly
        if (!dependant.isHidden && dependant['readonlyExpression']) {
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

        if (
          dependant.questionOptions.rendering === 'repeating' &&
          !isEmpty(dependant.questionOptions.repeatOptions?.limitExpression)
        ) {
          dependant.questionOptions.repeatOptions.limit = evaluateExpression(
            dependant.questionOptions.repeatOptions?.limitExpression,
            { value: dependant, type: 'field' },
            fields,
            { ...values, [fieldName]: value },
            {
              mode: sessionMode,
              patient,
            },
          );
          ({
            expressionResult: evaluateExpression(
              dependant.questionOptions.repeatOptions?.limitExpression,
              { value: dependant, type: 'field' },
              fields,
              { ...values, [fieldName]: value },
              {
                mode: sessionMode,
                patient,
              },
            ),
          });
        }
        let fields_temp = [...fields];
        const index = fields_temp.findIndex((f) => f.id == dep);
        fields_temp[index] = dependant;
        setFields(fields_temp);
      });
    }
    if (field.sectionDependants) {
      field.sectionDependants.forEach((dependant) => {
        for (let i = 0; i < form.pages.length; i++) {
          const section = form.pages[i].sections.find((section, _sectionIndex) => section.label == dependant);
          if (section) {
            evalHide({ value: section, type: 'section' }, fields, { ...values, [fieldName]: value });
            if (isTrue(section.isHidden)) {
              section.questions.forEach((field) => {
                field.isParentHidden = true;
                voidObsValueOnFieldHidden(field, obsGroupsToVoid, setFieldValue);
              });
            }
            break;
          }
        }
      });
    }
    if (field.pageDependants) {
      field.pageDependants?.forEach((dep) => {
        const dependant = form.pages.find((f) => f.label == dep);
        evalHide({ value: dependant, type: 'page' }, fields, { ...values, [fieldName]: value });
        if (isTrue(dependant.isHidden)) {
          dependant.sections.forEach((section) => {
            section.questions.forEach((field) => {
              field.isParentHidden = true;
              voidObsValueOnFieldHidden(field, obsGroupsToVoid, setFieldValue);
            });
          });
        }
        let form_temp = form;
        const index = form_temp.pages.findIndex((page) => page.label == dep);
        form_temp[index] = dependant;
        setForm(form_temp);
      });
    }
  };

  // set handler if not in view mode
  if (sessionMode !== 'view') {
    handlers.set(form.name, { validate: validate, submit: handleFormSubmit });
  }
  return (
    <OHRIFormContext.Provider
      value={{
        values,
        setFieldValue,
        setEncounterLocation: setEncounterLocation,
        setObsGroupsToVoid: setObsGroupsToVoid,
        obsGroupsToVoid: obsGroupsToVoid,
        fields: fields,
        encounterContext,
        layoutType,
        workspaceLayout,
        isFieldInitializationComplete,
        isSubmitting,
        formFieldHandlers,
      }}>
      <InstantEffect effect={addScrollablePages} />
      {form.pages.map((page, index) => {
        const pageHasNoVisibleContent =
          page.sections.every((section) => section.isHidden) ||
          page.sections.every((section) => section.questions.every((question) => question.isHidden)) ||
          isTrue(page.isHidden);

        if (!page.isSubform && pageHasNoVisibleContent) {
          return null;
        }
        if (isTrue(page.isSubform) && page.subform?.form && !page.isHidden) {
          if (sessionMode != 'enter' && !page.subform?.form.encounter) {
            return null;
          }
          return (
            <OHRIEncounterForm
              key={index}
              formJson={page.subform?.form}
              patient={patient}
              formSessionDate={encounterDate}
              provider={provider}
              location={location}
              visit={visit}
              values={values}
              isFormExpanded={isFormExpanded}
              sessionMode={sessionMode}
              scrollablePages={scrollablePages}
              setAllInitialValues={setAllInitialValues}
              allInitialValues={allInitialValues}
              setScrollablePages={setScrollablePages}
              setPagesWithErrors={setPagesWithErrors}
              setFieldValue={setFieldValue}
              setSelectedPage={setSelectedPage}
              handlers={handlers}
              workspaceLayout={workspaceLayout}
              setIsLoadingFormDependencies={setIsLoadingFormDependencies}
              isSubmitting
            />
          );
        }
        return (
          <OHRIFormPage
            page={page}
            onFieldChange={onFieldChange}
            setSelectedPage={setSelectedPage}
            isFormExpanded={isFormExpanded}
            key={index}
          />
        );
      })}
    </OHRIFormContext.Provider>
  );
};
