import React, { useEffect, useState } from 'react';
import { useField } from 'formik';
import { ErrorBoundary } from 'react-error-boundary';
import { ToastNotification } from '@carbon/react';
import { getFieldComponent, getHandler } from '../../registry/registry';
import { isTrue } from '../../utils/boolean-utils';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import { OHRIFormField, OHRIFormFieldProps } from '../../api/types';
import styles from './ohri-form-section.scss';

const OHRIFormSection = ({ fields, onFieldChange }) => {
  const [fieldToControlMap, setFieldToControlMap] = useState([]);

  useEffect(() => {
    Promise.all(
      fields.map(field => {
        return getFieldControl(field)?.then(result => ({ field, control: result.default }));
      }),
    ).then(results => {
      setFieldToControlMap(results);
    });
  }, [fields]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {}}>
      <div className={styles.sectionContainer}>
        {fieldToControlMap
          .filter(entry => !!entry)
          .map((entry, index) => {
            const { control, field } = entry;
            if (control) {
              const qnFragment = React.createElement<OHRIFormFieldProps>(control, {
                question: field,
                onChange: onFieldChange,
                key: index,
                handler: getHandler(field.type),
                useField,
              });
              return supportsUnspecified(field) && field.questionOptions.rendering != 'group' ? (
                <div key={index}>
                  {qnFragment}
                  <OHRIUnspecified question={field} />
                </div>
              ) : (
                <div key={index}>{qnFragment}</div>
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

export function getFieldControl(question: OHRIFormField) {
  if (isMissingConcept(question)) {
    // just render a disabled text input
    question.disabled = true;
    return getFieldComponent('text');
  }
  return getFieldComponent(question.questionOptions.rendering);
}

export function supportsUnspecified(question: OHRIFormField) {
  return (
    isTrue(question.unspecified) &&
    question.questionOptions.rendering != 'toggle' &&
    question.questionOptions.rendering != 'encounter-location'
  );
}

function isMissingConcept(question: OHRIFormField) {
  return (
    question.type == 'obs' && !question.questionOptions.concept && question.questionOptions.rendering !== 'fixed-value'
  );
}

export default OHRIFormSection;
