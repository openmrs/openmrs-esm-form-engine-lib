import React, { useEffect, useState } from 'react';
import { useField } from 'formik';
import { ErrorBoundary } from 'react-error-boundary';
import { ToastNotification } from '@carbon/react';
import { getRegisteredFieldSubmissionHandler } from '../../registry/registry';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import { OHRIFormField, OHRIFormFieldProps, previousValue, SubmissionHandler } from '../../api/types';
import styles from './ohri-form-section.scss';
import { formatPreviousValueDisplayText, getFieldControlWithFallback, isUnspecifiedSupported } from './helpers';
import { OHRITooltip } from '../inputs/tooltip/ohri-tooltip';
import { OHRIFormContext } from '../../ohri-form-context';
import { PreviousValueReview } from '../previous-value-review/previous-value-review.component';
import { isTrue } from '../../utils/boolean-utils';

interface FieldComponentMap {
  fieldComponent: React.ComponentType<OHRIFormFieldProps>;
  fieldDescriptor: OHRIFormField;
  handler: SubmissionHandler;
}

const OHRIFormSection = ({ fields, onFieldChange }) => {
  const [previousValues, setPreviousValues] = useState<Record<string, previousValue>>({});
  const [fieldComponentMapEntries, setFieldComponentMapEntries] = useState<FieldComponentMap[]>([]);
  const { encounterContext, fields: fieldsFromEncounter } = React.useContext(OHRIFormContext);

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
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {}}>
      <div className={styles.sectionContainer}>
        {fieldComponentMapEntries
          .filter((entry) => entry?.fieldComponent)
          .map((entry, index) => {
            const { fieldComponent: FieldComponent, fieldDescriptor, handler } = entry;

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
                    className={
                      fieldDescriptor.questionInfo &&
                      `${
                        fieldDescriptor.questionOptions.rendering !== 'radio'
                          ? styles.questionInfoCentralized
                          : styles.questionInfoDefault
                      }
                      `
                    }>
                    <div
                      className={`${
                        fieldDescriptor.questionOptions.rendering == 'radio' ||
                        fieldDescriptor.questionOptions.rendering == 'date' ||
                        fieldDescriptor.questionOptions.rendering == 'datetime' ||
                        fieldDescriptor.questionOptions.rendering == 'number'
                          ? ''
                          : styles.flexBasisOn
                      } ${fieldDescriptor.constrainMaxWidth && styles.controlWidthConstrained}`}>
                      {qnFragment}
                    </div>
                    {fieldDescriptor.questionInfo && (
                      <div className={styles.questionInfoControl}>
                        <OHRITooltip field={fieldDescriptor} />
                      </div>
                    )}
                  </div>

                  <div className={styles.unspecifiedContainer}>
                    {isUnspecifiedSupported(fieldDescriptor) &&
                      fieldDescriptor.questionOptions.rendering != 'group' && (
                        <OHRIUnspecified question={fieldDescriptor} onChange={onFieldChange} handler={handler} />
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
  // TODOS:
  // 1. Handle internationalization
  // 2. Show a more descriptive error message about the field
  return (
    <ToastNotification
      ariaLabel="closes notification"
      caption=""
      hideCloseButton
      lowContrast
      onClose={function noRefCheck() {}}
      onCloseButtonClick={function noRefCheck() {}}
      statusIconDescription="notification"
      subtitle={`Message: ${error.message}`}
      title="Error rendering field"
    />
  );
}

export default OHRIFormSection;
