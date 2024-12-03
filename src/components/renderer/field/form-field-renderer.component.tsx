import React, { useEffect, useMemo, useState } from 'react';
import {
  type FormField,
  type FormFieldInputProps,
  type FormFieldValueAdapter,
  type RenderType,
  type ValidationResult,
  type ValueAndDisplay,
} from '../../../types';
import { Controller, useWatch } from 'react-hook-form';
import { ToastNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from 'react-error-boundary';
import { hasRendering } from '../../../utils/common-utils';
import { useFormProviderContext } from '../../../provider/form-provider';
import { isEmpty } from '../../../validators/form-validator';
import PreviousValueReview from '../../previous-value-review/previous-value-review.component';
import { getFieldControlWithFallback, getRegisteredControl } from '../../../registry/registry';
import styles from './form-field-renderer.scss';
import { isTrue } from '../../../utils/boolean-utils';
import UnspecifiedField from '../../inputs/unspecified/unspecified.component';
import { handleFieldLogic, validateFieldValue } from './fieldLogic';

export interface FormFieldRendererProps {
  fieldId: string;
  valueAdapter: FormFieldValueAdapter;
  repeatOptions?: {
    targetRendering: RenderType;
  };
}

export const FormFieldRenderer = ({ fieldId, valueAdapter, repeatOptions }: FormFieldRendererProps) => {
  const [inputComponentWrapper, setInputComponentWrapper] = useState<{
    value: React.ComponentType<FormFieldInputProps>;
  }>(null);
  const [errors, setErrors] = useState<ValidationResult[]>([]);
  const [warnings, setWarnings] = useState<ValidationResult[]>([]);
  const [historicalValue, setHistoricalValue] = useState<ValueAndDisplay>(null);
  const context = useFormProviderContext();

  const {
    methods: { control, getValues, getFieldState },
    patient,
    sessionMode,
    formFields,
    formFieldValidators,
    addInvalidField,
    removeInvalidField,
    updateFormField,
  } = context;

  const fieldValue = useWatch({ control, name: fieldId, exact: true });
  const noop = () => {};

  const field = useMemo(() => formFields.find((field) => field.id === fieldId), [fieldId, formFields]);

  useEffect(() => {
    if (hasRendering(field, 'repeating') && repeatOptions?.targetRendering) {
      getRegisteredControl(repeatOptions.targetRendering).then((component) => {
        if (component) {
          setInputComponentWrapper({ value: component });
        }
      });
    } else {
      getFieldControlWithFallback(field).then((component) => {
        if (component) {
          setInputComponentWrapper({ value: component });
        }
      });
    }
    if (sessionMode === 'enter' && (field.historicalExpression || context.previousDomainObjectValue)) {
      try {
        context.processor.getHistoricalValue(field, context).then((value) => {
          setHistoricalValue(value);
        });
      } catch (error) {
        console.error(error);
      }
    }
  }, []);

  useEffect(() => {
    const { isDirty, isTouched } = getFieldState(field.id);
    const { submission, unspecified } = field.meta;
    const { calculate, defaultValue } = field.questionOptions;
    if (
      !isEmpty(fieldValue) &&
      !submission?.newValue &&
      !isDirty &&
      !unspecified &&
      (calculate?.calculateExpression || defaultValue)
    ) {
      valueAdapter.transformFieldValue(field, fieldValue, context);
    }
    if (isDirty || isTouched) {
      onAfterChange(fieldValue);
    }
  }, [fieldValue]);

  useEffect(() => {
    if (field.meta.submission?.errors) {
      setErrors(field.meta.submission.errors);
    }
    if (field.meta.submission?.warnings) {
      setWarnings(field.meta.submission.warnings);
    }
    if (field.meta.submission?.unspecified) {
      setErrors([]);
      removeInvalidField(field.id);
    }
  }, [field.meta.submission]);

  const onAfterChange = (value: any) => {
    const { errors: validationErrors, warnings: validationWarnings } = validateFieldValue(
      field,
      value,
      formFieldValidators,
      {
        formFields: formFields,
        values: getValues(),
        expressionContext: { patient, mode: sessionMode },
      },
    );
    if (errors.length && !validationErrors.length) {
      removeInvalidField(field.id);
      setErrors([]);
    } else if (validationErrors.length) {
      setErrors(validationErrors);
      addInvalidField(field);
    }
    if (!validationErrors.length) {
      valueAdapter.transformFieldValue(field, value, context);
    }
    setWarnings(validationWarnings);
    handleFieldLogic(field, context);
    if (field.meta.groupId) {
      const group = formFields.find((f) => f.id === field.meta.groupId);
      if (group) {
        group.questions = group.questions.map((child) => {
          if (child.id === field.id) {
            return field;
          }
          return child;
        });
        updateFormField(group);
      }
    }
  };

  if (!inputComponentWrapper) {
    return null;
  }

  const InputComponent = inputComponentWrapper.value;

  if (!repeatOptions?.targetRendering && isGroupField(field.questionOptions.rendering)) {
    return (
      <InputComponent
        key={field.id}
        field={field}
        value={null}
        errors={errors}
        warnings={warnings}
        setFieldValue={null}
      />
    );
  }
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={noop}>
      <Controller
        control={control}
        name={field.id}
        render={({ field: { value, onChange, onBlur } }) => (
          <div>
            <InputComponent
              key={`${field.id}-input-component`}
              field={field}
              value={value}
              errors={errors}
              warnings={warnings}
              setFieldValue={(val) => {
                onChange(val);
                onAfterChange(val);
                onBlur();
              }}
            />
            {isUnspecifiedSupported(field) && (
              <div className={styles.unspecifiedContainer}>
                {field.unspecified && (
                  <UnspecifiedField
                    key={`${field.id}-unspecified`}
                    field={field}
                    setFieldValue={onChange}
                    onAfterChange={onAfterChange}
                    fieldValue={value}
                  />
                )}
              </div>
            )}
            {historicalValue?.value && (
              <div>
                <PreviousValueReview
                  key={`${field.id}-previous-value-review`}
                  previousValue={historicalValue.value}
                  displayText={historicalValue.display}
                  onAfterChange={onAfterChange}
                  field={field}
                />
              </div>
            )}
          </div>
        )}
      />
    </ErrorBoundary>
  );
};

function ErrorFallback({ error }) {
  const { t } = useTranslation();
  return (
    <ToastNotification
      aria-label={t('closesNotification', 'Closes notification')}
      caption=""
      hideCloseButton
      lowContrast
      onClose={function noRefCheck() {}}
      onCloseButtonClick={function noRefCheck() {}}
      statusIconDescription={t('notification', 'Notification')}
      subtitle={error.message}
      title={t('errorRenderingField', 'Error rendering field')}
    />
  );
}

/**
 * Determines whether a field can be unspecified
 */
export function isUnspecifiedSupported(question: FormField) {
  const { rendering } = question.questionOptions;
  return (
    isTrue(question.unspecified) &&
    rendering != 'toggle' &&
    rendering != 'group' &&
    rendering != 'repeating' &&
    rendering != 'markdown' &&
    rendering != 'extension-widget' &&
    rendering != 'workspace-launcher'
  );
}

export function isGroupField(rendering: RenderType) {
  return rendering === 'group' || rendering === 'repeating';
}
