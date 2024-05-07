import React, { useContext, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useField } from 'formik';
import type { FormField, FormFieldProps, previousValue, SubmissionHandler } from '../../types';
import { ErrorBoundary } from 'react-error-boundary';
import { ToastNotification } from '@carbon/react';
import { formatPreviousValueDisplayText, getFieldControlWithFallback, isUnspecifiedSupported } from './helpers';
import { getRegisteredFieldSubmissionHandler } from '../../registry/registry';
import { isTrue } from '../../utils/boolean-utils';
import { FormContext } from '../../form-context';
import PreviousValueReview from '../previous-value-review/previous-value-review.component';
import Tooltip from '../inputs/tooltip/tooltip.component';
import UnspecifiedField from '../inputs/unspecified/unspecified.component';
import styles from './form-section.scss';
import { evaluateExpression } from '../../utils/expression-runner';
import dayjs from 'dayjs';
import { parseToLocalDateTime } from '../../utils/form-helper';

interface FieldComponentMap {
  fieldComponent: React.ComponentType<FormFieldProps>;
  fieldDescriptor: FormField;
  handler: SubmissionHandler;
}

const historicalValueTransformer = (field, obs) => {
  const rendering = field.questionOptions.rendering;
  if (typeof obs.value == 'string' || typeof obs.value == 'number') {
    if (rendering == 'date' || rendering == 'datetime') {
      const dateObj = parseToLocalDateTime(`${obs.value}`);
      return { value: dateObj, display: dayjs(dateObj).format('YYYY-MM-DD HH:mm') };
    }
    return { value: obs.value, display: obs.value };
  }
  if (rendering == 'checkbox') {
    return obs.map((each) => {
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
};

const FormSection = ({ fields, onFieldChange }) => {
  const [previousValues, setPreviousValues] = useState<Record<string, previousValue>>({});
  const [fieldComponentMapEntries, setFieldComponentMapEntries] = useState<FieldComponentMap[]>([]);
  const { encounterContext, fields: fieldsFromEncounter } = useContext(FormContext);

  const noop = () => {};

  useEffect(() => {
    Promise.all(
      fields.map(async (fieldDescriptor) => {
        const fieldComponent = await getFieldControlWithFallback(fieldDescriptor);
        const handler = await getRegisteredFieldSubmissionHandler(fieldDescriptor.type);
        return { fieldDescriptor, fieldComponent, handler };
      }),
    ).then((results) => {
      setFieldComponentMapEntries(results);
    });
  }, [fields]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={noop}>
      <div className={styles.sectionContainer}>
        {fieldComponentMapEntries
          .filter((entry) => entry?.fieldComponent)
          .map((entry, index) => {
            const { fieldComponent: FieldComponent, fieldDescriptor, handler } = entry;
            const rendering = fieldDescriptor.questionOptions.rendering;

            const historicalValue = fieldDescriptor.historicalExpression
              ? evaluateExpression(
                  fieldDescriptor.historicalExpression,
                  { value: fieldDescriptor, type: 'field' },
                  fieldsFromEncounter,
                  encounterContext.initValues,
                  {
                    mode: encounterContext.sessionMode,
                    patient: encounterContext.patient,
                    previousEncounter: encounterContext.previousEncounter,
                  },
                )
              : null;

            const previousFieldValue = encounterContext.previousEncounter
              ? handler?.getPreviousValue(fieldDescriptor, encounterContext.previousEncounter, fieldsFromEncounter)
              : null;

            const transformedHistoricalValue = historicalValue
              ? historicalValueTransformer(fieldDescriptor, historicalValue)
              : null;

            if (FieldComponent) {
              const qnFragment = (
                <FieldComponent
                  question={fieldDescriptor}
                  onChange={onFieldChange}
                  key={index}
                  handler={handler}
                  useField={useField}
                  previousValue={previousValues[fieldDescriptor.id]}
                />
              );

              return (
                <div key={index} className={styles.parentResizer}>
                  <div
                    className={classNames({
                      [styles.questionInfoDefault]: fieldDescriptor.questionInfo && rendering === 'radio',
                      [styles.questionInfoCentralized]: fieldDescriptor.questionInfo && rendering !== 'radio',
                    })}>
                    <div
                      className={classNames({
                        [styles.flexBasisOn]: [
                          'ui-select-extended',
                          'content-switcher',
                          'select',
                          'textarea',
                          'text',
                          'checkbox',
                        ].includes(rendering),
                      })}>
                      {qnFragment}
                    </div>
                    {fieldDescriptor.questionInfo && (
                      <div className={styles.questionInfoControl}>
                        <Tooltip field={fieldDescriptor} />
                      </div>
                    )}
                  </div>

                  <div className={styles.unspecifiedContainer}>
                    {isUnspecifiedSupported(fieldDescriptor) && rendering != 'group' && (
                      <UnspecifiedField question={fieldDescriptor} onChange={onFieldChange} handler={handler} />
                    )}
                  </div>
                  {encounterContext?.previousEncounter &&
                    (previousFieldValue || historicalValue) &&
                    (isTrue(fieldDescriptor.questionOptions.enablePreviousValue) ||
                      fieldDescriptor.historicalExpression) && (
                      <div className={styles.previousValue}>
                        <PreviousValueReview
                          previousValue={previousFieldValue || transformedHistoricalValue}
                          displayText={formatPreviousValueDisplayText(
                            fieldDescriptor,
                            previousFieldValue || transformedHistoricalValue,
                          )}
                          setValue={setPreviousValues}
                          field={fieldDescriptor.id}
                        />
                      </div>
                    )}
                </div>
              );
            }
          })}
      </div>
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

export default FormSection;
