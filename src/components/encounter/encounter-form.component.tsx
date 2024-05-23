import React, { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { type SessionLocation, showSnackbar, useLayoutType, type Visit } from '@openmrs/esm-framework';
import { codedTypes, ConceptFalse, ConceptTrue } from '../../constants';
import type {
  FormField,
  FormPage as FormPageProps,
  FormSchema,
  OpenmrsEncounter,
  QuestionAnswerOption,
  SessionMode,
  ValidationResult,
} from '../../types';
import FormPage from '../page/form-page.component';
import { FormContext } from '../../form-context';
import {
  cascadeVisibityToChildFields,
  evalConditionalRequired,
  evaluateFieldReadonlyProp,
  findConceptByReference,
  findPagesWithErrors,
} from '../../utils/form-helper';
import { InstantEffect } from '../../utils/instant-effect';
import { type FormSubmissionHandler } from '../../form-engine.component';
import { evaluateAsyncExpression, evaluateExpression } from '../../utils/expression-runner';
import { getPreviousEncounter } from '../../api/api';
import { isTrue } from '../../utils/boolean-utils';
import { FieldValidator, isEmpty } from '../../validators/form-validator';
import { scrollIntoView } from '../../utils/scroll-into-view';
import { useEncounter } from '../../hooks/useEncounter';
import { useInitialValues } from '../../hooks/useInitialValues';
import { useConcepts } from '../../hooks/useConcepts';
import { useFormFieldHandlers } from '../../hooks/useFormFieldHandlers';
import { useFormFieldValidators } from '../../hooks/useFormFieldValidators';
import { useTranslation } from 'react-i18next';
import { EncounterFormManager } from './encounter-form-manager';
import { extractErrorMessagesFromResponse } from '../../utils/error-utils';
import { usePatientPrograms } from '../../hooks/usePatientPrograms';

interface EncounterFormProps {
  formJson: FormSchema;
  patient: any;
  formSessionDate: Date;
  provider: string;
  role: string;
  location: SessionLocation;
  visit?: Visit;
  values: Record<string, any>;
  isFormExpanded: boolean;
  sessionMode: SessionMode;
  scrollablePages: Set<FormPageProps>;
  handlers: Map<string, FormSubmissionHandler>;
  allInitialValues: Record<string, any>;
  workspaceLayout: 'minimized' | 'maximized';
  setAllInitialValues: (values: Record<string, any>) => void;
  setScrollablePages: (pages: Set<FormPageProps>) => void;
  setPagesWithErrors: (pages: string[]) => void;
  setIsLoadingFormDependencies?: (value: boolean) => void;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  setSelectedPage: (page: string) => void;
  isSubmitting: boolean;
  setIsSubmitting?: Dispatch<SetStateAction<boolean>>;
}

const EncounterForm: React.FC<EncounterFormProps> = ({
  formJson,
  patient,
  formSessionDate,
  provider,
  role,
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
}) => {
  const { t } = useTranslation();
  const [fields, setFields] = useState<Array<FormField>>([]);
  const [encounterLocation, setEncounterLocation] = useState(null);
  const [encounterDate, setEncounterDate] = useState(formSessionDate);
  const [encounterProvider, setEncounterProvider] = useState(provider);
  const [encounterRole, setEncounterRole] = useState(role);
  const { encounter, isLoading: isLoadingEncounter } = useEncounter(formJson);
  const [previousEncounter, setPreviousEncounter] = useState<OpenmrsEncounter>(null);
  const [isLoadingPreviousEncounter, setIsLoadingPreviousEncounter] = useState(true);
  const [form, setForm] = useState<FormSchema>(formJson);
  const [isFieldInitializationComplete, setIsFieldInitializationComplete] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);
  const [initValues, setInitValues] = useState({});
  const { isLoading: isLoadingPatientPrograms, patientPrograms } = usePatientPrograms(patient?.id, formJson);

  const layoutType = useLayoutType();
  const { encounterContext, isLoadingContextDependencies } = useMemo(() => {
    const contextObject = {
      patient: patient,
      encounter: encounter,
      previousEncounter,
      location: encounterLocation,
      sessionMode: sessionMode || (encounter ? 'edit' : 'enter'),
      encounterDate: formSessionDate,
      encounterProvider: provider,
      encounterRole,
      form: form,
      visit: visit,
      initValues: initValues,
      patientPrograms,
      setEncounterDate,
      setEncounterProvider,
      setEncounterLocation,
      setEncounterRole,
    };
    return {
      encounterContext: contextObject,
      isLoadingContextDependencies: isLoadingEncounter || isLoadingPreviousEncounter || isLoadingPatientPrograms,
    };
  }, [
    encounter,
    encounterLocation,
    patient,
    previousEncounter,
    sessionMode,
    initValues,
    patientPrograms,
    isLoadingPatientPrograms,
    isLoadingPreviousEncounter,
    isLoadingEncounter,
  ]);

  // given the form, flatten the fields and pull out all concept references
  const [flattenedFields, conceptReferences] = useMemo(() => {
    const flattenedFieldsTemp = [];
    const conceptReferencesTemp = new Set<string>();
    form.pages?.forEach((page) =>
      page.sections?.forEach((section) => {
        section.questions?.forEach((question) => {
          section.inlineRendering = isEmpty(section.inlineRendering) ? null : section.inlineRendering;
          page.inlineRendering = isEmpty(page.inlineRendering) ? null : page.inlineRendering;
          form.inlineRendering = isEmpty(form.inlineRendering) ? null : form.inlineRendering;
          question.inlineRendering = section.inlineRendering ?? page.inlineRendering ?? form.inlineRendering;
          evaluateFieldReadonlyProp(question, section.readonly, page.readonly, form.readonly);
          if (question.questionOptions?.rendering == 'fixed-value' && !question['fixedValue']) {
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
    isLoadingContextDependencies,
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
          if (typeof field.required === 'object' && field.required?.type === 'conditionalRequired') {
            field.isRequired = evalConditionalRequired(field, flattenedFields, tempInitialValues);
          } else {
            field.isRequired = isTrue(field.required);
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

          // this checks for expressions to disable checkbox options
          field.questionOptions.answers
            ?.filter((answer: QuestionAnswerOption) => !isEmpty(answer.disable?.disableWhenExpression))
            .forEach((answer: QuestionAnswerOption) => {
              answer.disable.isDisabled = evaluateExpression(
                answer.disable?.disableWhenExpression,
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
          if (
            codedTypes.includes(field.questionOptions.rendering) &&
            !field.questionOptions.answers?.length &&
            matchingConcept?.conceptClass?.display === 'Question' &&
            matchingConcept?.answers?.length
          ) {
            field.questionOptions.answers = matchingConcept.answers.map((answer) => {
              return {
                concept: answer?.uuid,
                label: answer?.display,
              };
            });
          }
          field.meta = {
            ...(field.meta || {}),
            concept: matchingConcept,
          };
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

  const evalHide = (node, allFields: FormField[], allValues: Record<string, any>) => {
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
        cascadeVisibityToChildFields(isHidden, section, allFields);
      });
    }
    if (type == 'section') {
      cascadeVisibityToChildFields(isHidden, value, allFields);
    }
  };

  useEffect(() => {
    if (invalidFields?.length) {
      setPagesWithErrors(findPagesWithErrors(scrollablePages, invalidFields));

      let firstRadioGroupMemberDomId;

      switch (invalidFields[0].questionOptions.rendering) {
        case 'date':
          scrollIntoView(invalidFields[0].id, false);
          break;
        case 'radio':
          firstRadioGroupMemberDomId = `${invalidFields[0].id}-${invalidFields[0].questionOptions.answers[0].label}`;
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
        .filter((field) => field.meta.submission?.unspecified !== true)
        .forEach((field) => {
          const errors =
            FieldValidator.validate(field, values[field.id]).filter((error) => error.resultType == 'error') ?? [];
          if (errors.length) {
            errorFields.push(field);
            field.meta.submission = { ...(field.meta.submission || {}), errors };
            formHasErrors = true;
            return;
          }
        });
      setInvalidFields([...errorFields]);

      return !formHasErrors;
    },
    [fields],
  );

  const handleFormSubmit = async (values: Record<string, any>) => {
    const abortController = new AbortController();
    const patientIdentifiers = EncounterFormManager.preparePatientIdentifiers(fields, encounterLocation);
    const encounter = EncounterFormManager.prepareEncounter(
      fields,
      { ...encounterContext, encounterProvider, encounterRole, location: encounterLocation },
      visit,
      formJson.encounterType,
      formJson.uuid,
    );

    try {
      await Promise.all(EncounterFormManager.savePatientIdentifiers(patient, patientIdentifiers));
      if (patientIdentifiers?.length) {
        showSnackbar({
          title: t('patientIdentifiersSaved', 'Patient identifier(s) saved successfully'),
          kind: 'success',
          isLowContrast: true,
        });
      }
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: t('errorSavingPatientIdentifiers', 'Error saving patient identifiers'),
        subtitle: errorMessages.join(', '),
        kind: 'error',
        isLowContrast: false,
      });
    }

    try {
      const programs = EncounterFormManager.preparePatientPrograms(fields, patient, patientPrograms);
      const savedPrograms = await EncounterFormManager.savePatientPrograms(programs);
      if (savedPrograms?.length) {
        showSnackbar({
          title: t('patientProgramsSaved', 'Patient program(s) saved successfully'),
          kind: 'success',
          isLowContrast: true,
        });
      }
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: t('errorSavingPatientPrograms', 'Error saving patient program(s)'),
        subtitle: errorMessages.join(', '),
        kind: 'error',
        isLowContrast: false,
      });
    }

    try {
      const { data: savedEncounter } = await EncounterFormManager.saveEncounter(encounter, abortController);
      const saveOrders = savedEncounter.orders.map((order) => order.orderNumber);
      if (saveOrders.length) {
        showSnackbar({
          title: t('ordersSaved', 'Order(s) saved successfully'),
          subtitle: saveOrders.join(', '),
          kind: 'success',
          isLowContrast: true,
        });
      }
      // handle attachments
      try {
        const attachmentsResponse = await Promise.all(
          EncounterFormManager.saveAttachments(fields, savedEncounter, abortController),
        );
        if (attachmentsResponse?.length) {
          showSnackbar({
            title: t('attachmentsSaved', 'Attachment(s) saved successfully'),
            kind: 'success',
            isLowContrast: true,
          });
        }
      } catch (error) {
        const errorMessages = extractErrorMessagesFromResponse(error);
        return Promise.reject({
          title: t('errorSavingAttachments', 'Error saving attachment(s)'),
          subtitle: errorMessages.join(', '),
          kind: 'error',
          isLowContrast: false,
        });
      }
      return savedEncounter;
    } catch (error) {
      console.error(error.responseBody);
      const errorMessages = extractErrorMessagesFromResponse(error);
      return Promise.reject({
        title: t('errorSavingEncounter', 'Error saving encounter'),
        subtitle: errorMessages.join(', '),
        kind: 'error',
        isLowContrast: false,
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
    const baseValidatorConfig = {
      expressionContext: { patient, mode: sessionMode },
      values: { ...values, [fieldName]: value },
      fields,
    };
    const errors = [];
    const warnings = [];
    if (!isUnspecified) {
      for (let validatorConfig of validators) {
        const errorsAndWarnings =
          formFieldValidators[validatorConfig.type]?.validate(field, value, {
            ...baseValidatorConfig,
            ...validatorConfig,
          }) || [];
        errors.push(...errorsAndWarnings.filter((error) => error.resultType == 'error'));
        warnings.push(...errorsAndWarnings.filter((error) => error.resultType == 'warning'));
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
        }
        // evaluate conditional required
        if (typeof dependant.required === 'object' && dependant.required?.type === 'conditionalRequired') {
          dependant.isRequired = evalConditionalRequired(dependant, fields, { ...values, [fieldName]: value });
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

        dependant?.questionOptions.answers
          ?.filter((answer) => !isEmpty(answer.disable?.isDisabled))
          .forEach((answer) => {
            answer.disable.isDisabled = evaluateExpression(
              answer.disable?.disableWhenExpression,
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
    <FormContext.Provider
      value={{
        values,
        fields: fields,
        encounterContext,
        layoutType,
        workspaceLayout,
        isFieldInitializationComplete,
        isSubmitting,
        formFieldHandlers,
        setFieldValue,
        setEncounterLocation: setEncounterLocation,
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
            <EncounterForm
              key={index}
              formJson={page.subform?.form}
              patient={patient}
              formSessionDate={encounterDate}
              provider={provider}
              role={encounterRole}
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
          <FormPage
            page={page}
            onFieldChange={onFieldChange}
            setSelectedPage={setSelectedPage}
            isFormExpanded={isFormExpanded}
            key={index}
          />
        );
      })}
    </FormContext.Provider>
  );
};

export default EncounterForm;
