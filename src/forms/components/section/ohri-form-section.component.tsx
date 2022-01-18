import React, { useCallback, useState } from 'react';
import styles from './ohri-form-section.scss';
import { getFieldComponent, getHandler } from '../../registry/registry';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import { OHRIFormField } from '../../types';
import { isTrue } from '../../utils/boolean-utils';

export const getFieldControl = (question: OHRIFormField) => {
  // Check if a concept wasn't provided
  if (question.type == 'obs' && !question.questionOptions.concept) {
    // Disable the control
    question.disabled = true;
    // Since we don't have a concept, just render a text input
    return getFieldComponent('text');
  }
  return getFieldComponent(question.questionOptions.rendering);
};

export const supportsUnspecified = question => {
  return (
    isTrue(question.unspecified) &&
    question.questionOptions.rendering != 'toggle' &&
    question.questionOptions.rendering != 'encounter-location'
  );
};
const OHRIFormSection = ({ fields, onFieldChange, sectionTitle, showTitle }) => {
  return (
    <div className={styles.sectionContainer}>
      {fields.map((value, index) => {
        const component = getFieldControl(value);
        if (component) {
          const qnFragment = React.createElement(component, {
            question: value,
            onChange: onFieldChange,
            key: index,
            handler: getHandler(value.type),
          });

          return supportsUnspecified(value) && value.questionOptions.rendering != 'group' ? (
            <div className={styles.questionOverrides} key={index}>
              {qnFragment}
              <OHRIUnspecified question={value} />
            </div>
          ) : (
            <div className={styles.questionOverrides} key={index}>
              {qnFragment}
            </div>
          );
        }
      })}
    </div>
  );
};

export default OHRIFormSection;
