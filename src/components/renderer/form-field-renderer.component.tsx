import React, { useEffect, useState } from 'react';
import {
  type FormField,
  type RenderType,
  type ValidationResult,
  type FormFieldValidator,
  type SessionMode,
} from '../../types';
import { Controller } from 'react-hook-form';
import { ToastNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from 'react-error-boundary';
import { type FormFieldValueAdapter, type FormFieldInputProps } from '../../types';
import { getFieldControlWithFallback } from '../../utils/common-utils';
import { useFormProviderContext } from '../../provider/form-provider';

export const FormFieldRenderer = ({
  field,
  valueAdapter,
}: {
  field: FormField;
  valueAdapter: FormFieldValueAdapter;
}) => {
  const [inputComponentWrapper, setInputComponentWrapper] = useState<{
    value: React.ComponentType<FormFieldInputProps>;
  }>(null);
  const [errors, setErrors] = useState<ValidationResult[]>([]);
  const [warnings, setWarnings] = useState<ValidationResult[]>([]);
  const [previousValue, setPreviousValue] = useState<any>(null);
  const context = useFormProviderContext();

  const {
    methods: { control, getValues },
    patient,
    sessionMode,
    formFields,
    previousDomainObjectValue,
    formFieldValidators,
    addInvalidField,
    removeInvalidField,
    evalExpression,
  } = context;

  const noop = () => {};

  useEffect(() => {
    getFieldControlWithFallback(field).then((component) => {
      if (component) {
        setInputComponentWrapper({ value: component });
      }
    });
  }, []);

  useEffect(() => {
    if (field.meta?.submission?.errors) {
      setErrors(field.meta.submission.errors);
    }
    if (field.meta?.submission?.warnings) {
      setWarnings(field.meta.submission.warnings);
    }
  }, [field.meta?.submission]);

  useEffect(() => {
    if (previousDomainObjectValue) {
      if (field.historicalExpression) {
        const previousValue = evalExpression(field.historicalExpression, {
          value: field,
          type: 'field',
        });
        setPreviousValue(previousValue);
      } else {
        const previousValue = valueAdapter.getPreviousValue(field, previousDomainObjectValue, context);
        setPreviousValue(previousValue);
      }
    }
  }, []);

  const onAfterChange = (value: any) => {
    // validate field value
    const { errors: validationErrors, warnings: validationWarnings } = validateFieldValue(
      field,
      value,
      formFieldValidators,
      {
        fields: formFields,
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
  };

  if (!inputComponentWrapper) {
    return null;
  }

  const InputComponent = inputComponentWrapper.value;

  if (isGroupField(field.questionOptions.rendering)) {
    return (
      <InputComponent
        field={field}
        value={null}
        errors={errors}
        warnings={warnings}
        setFieldValue={null}
        onAfterChange={onAfterChange}
      />
    );
  }
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={noop}>
      <Controller
        control={control}
        name={field.id}
        render={({ field: { onChange, value } }) => (
          <InputComponent
            field={field}
            value={value}
            errors={errors}
            warnings={warnings}
            setFieldValue={onChange}
            onAfterChange={onAfterChange}
          />
        )}
      />
    </ErrorBoundary>
  );
};

function ErrorFallback({ error }) {
  const { t } = useTranslation();
  return (
    <ToastNotification
      ariaLabel={t('closesNotification', 'Closes notification')}
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

function isGroupField(rendering: RenderType) {
  return rendering === 'group' || rendering === 'repeating';
}

export interface ValidatorConfig {
  fields: FormField[];
  values: Record<string, any>;
  expressionContext: {
    patient: fhir.Patient;
    mode: SessionMode;
  };
}

function validateFieldValue(
  field: FormField,
  value: any,
  validators: Record<string, FormFieldValidator>,
  context: ValidatorConfig,
): { errors: ValidationResult[]; warnings: ValidationResult[] } {
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];

  if (field.meta.submission?.unspecified) {
    return { errors: [], warnings: [] };
  }

  try {
    field.validators.forEach((validatorConfig) => {
      const results = validators[validatorConfig.type]?.validate?.(field, value, {
        ...validatorConfig,
        ...context,
      });
      if (results) {
        results.forEach((result) => {
          if (result.resultType === 'error') {
            errors.push(result);
          } else if (result.resultType === 'warning') {
            warnings.push(result);
          }
        });
      }
    });
  } catch (error) {
    console.error(error);
  }

  return { errors, warnings };
}
