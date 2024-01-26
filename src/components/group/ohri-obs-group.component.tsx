import React, { useContext, useEffect, useState } from 'react';
import { OHRIFormContext } from '../../ohri-form-context';
import { OHRIFormFieldProps } from '../../api/types';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import styles from './ohri-obs-group.scss';
import { useField } from 'formik';
import { getFieldControlWithFallback, isUnspecifiedSupported } from '../section/helpers';
import { OHRITooltip } from '../inputs/tooltip/ohri-tooltip';
import { isTrue } from '../../utils/boolean-utils';
import { PreviousValueReview } from '../previous-value-review/previous-value-review.component';

export interface ObsGroupProps extends OHRIFormFieldProps {
  deleteControl?: any;
}

export const OHRIObsGroup: React.FC<ObsGroupProps> = ({ question, onChange, deleteControl }) => {
  const [previousValues, setPreviousValues] = useState<Array<Record<string, any>>>([]);
  const [groupMembersControlMap, setGroupMembersControlMap] = useState([]);
  const { formFieldHandlers } = useContext(OHRIFormContext);
  const { encounterContext, fields: fieldsFromEncounter } = React.useContext(OHRIFormContext);

  // console.log('obsgroup', encounterContext.previousEncounter);

  useEffect(() => {
    if (question.questions) {
      Promise.all(
        question.questions.map((field) => {
          return getFieldControlWithFallback(field)?.then((result) => ({ field, control: result }));
        }),
      ).then((results) => {
        setGroupMembersControlMap(results);
      });
    }
  }, [question.questions]);
  const groupContent = groupMembersControlMap
    .filter((groupMemberMapItem) => !!groupMemberMapItem && !groupMemberMapItem.field.isHidden)
    .map((groupMemberMapItem, index) => {
      const { control, field } = groupMemberMapItem;
      if (control) {
        const questionFragment = React.createElement(control, {
          question: field,
          onChange: onChange,
          key: index,
          handler: formFieldHandlers[field.type],
          useField,
        });

        const prevValue = encounterContext.previousEncounter
          ? formFieldHandlers[field.type]?.getPreviousValue(
              field,
              encounterContext.previousEncounter,
              fieldsFromEncounter,
            )
          : { value: 'no previous value' };

        // console.log(field.id, prevValue);

        return (
          <div className={`${styles.flexColumn} ${styles.obsGroupColumn} `}>
            <div className={styles.parent}>
              {questionFragment}
              <div className={isUnspecifiedSupported(field) ? styles.tooltipWithUnspecified : styles.tooltip}>
                {isUnspecifiedSupported(field) && (
                  <OHRIUnspecified question={field} onChange={onChange} handler={formFieldHandlers[field.type]} />
                )}
                {field.questionInfo && <OHRITooltip field={field} />}
              </div>
              {encounterContext?.previousEncounter &&
                prevValue &&
                !isTrue(field.questionOptions.usePreviousValueDisabled) && (
                  <div className={styles.previousValue}>
                    <PreviousValueReview
                      value={prevValue?.value}
                      displayText={prevValue?.display}
                      setValue={setPreviousValues}
                      field={field.id}
                    />
                  </div>
                )}
            </div>
          </div>
        );
      }
    });
  if (groupContent && deleteControl) {
    groupContent.push(deleteControl);
  }
  return <div className={styles.flexRow}>{groupContent}</div>;
};
