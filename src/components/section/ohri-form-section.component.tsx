import React, { useEffect, useState } from 'react';
import { useField } from 'formik';
import { ErrorBoundary } from 'react-error-boundary';
import { ToastNotification } from '@carbon/react';
import { getRegisteredFieldSubmissionHandler } from '../../registry/registry';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import { OHRIFormField, OHRIFormFieldProps, SubmissionHandler } from '../../api/types';
import styles from './ohri-form-section.scss';
import { getFieldControlWithFallback, isUnspecifiedSupported } from './helpers';
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
  //previous values state to live here
  const [previousValues, setPreviousValues] = useState<Array<Record<string, any>>>([]);
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
            if (FieldComponent) {
              const previousValue = previousValues?.find((searchItem) => searchItem.field === fieldDescriptor.id);
              const qnFragment = (
                <FieldComponent
                  question={fieldDescriptor}
                  onChange={onFieldChange}
                  key={index}
                  handler={handler}
                  useField={useField}
                  previousValue={previousValue}
                  //can pass in optional previous value here if available
                />
              );

              const prevValue = encounterContext.previousEncounter
                ? handler?.getPreviousValue(fieldDescriptor, encounterContext.previousEncounter, fieldsFromEncounter)
                : { value: 'no previous value' };

              // console.log(prevValue);
              return (
                <div key={index} className={styles.parent}>
                  {qnFragment}
                  <div
                    className={
                      isUnspecifiedSupported(fieldDescriptor) ? styles.tooltipWithUnspecified : styles.tooltip
                    }>
                    {isUnspecifiedSupported(fieldDescriptor) &&
                      fieldDescriptor.questionOptions.rendering != 'group' && (
                        <OHRIUnspecified question={fieldDescriptor} onChange={onFieldChange} handler={handler} />
                      )}
                    {fieldDescriptor.questionInfo && <OHRITooltip field={fieldDescriptor} />}
                  </div>
                  {encounterContext?.previousEncounter &&
                    prevValue &&
                    !isTrue(fieldDescriptor.questionOptions.usePreviousValueDisabled) && (
                      <div className={styles.previousValue}>
                        <PreviousValueReview
                          value={prevValue?.value}
                          displayText={prevValue?.display}
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
