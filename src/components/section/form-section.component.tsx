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

interface FieldComponentMap {
  fieldComponent: React.ComponentType<FormFieldProps>;
  fieldDescriptor: FormField;
  handler: SubmissionHandler;
}

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
            const previousFieldValue = encounterContext.previousEncounter
              ? handler?.getPreviousValue(fieldDescriptor, encounterContext.previousEncounter, fieldsFromEncounter)
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
                    previousFieldValue &&
                    !isTrue(fieldDescriptor.questionOptions.usePreviousValueDisabled) && (
                      <div className={styles.previousValue}>
                        <PreviousValueReview
                          previousValue={previousFieldValue}
                          displayText={formatPreviousValueDisplayText(fieldDescriptor, previousFieldValue)}
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
