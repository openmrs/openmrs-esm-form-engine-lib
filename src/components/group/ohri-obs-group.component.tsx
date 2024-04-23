import React, { useContext, useEffect, useState } from 'react';
import classNames from 'classnames';
import { OHRIFormContext } from '../../ohri-form-context';
import { OHRIFormFieldProps } from '../../api/types';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import { useField } from 'formik';
import { getFieldControlWithFallback, isUnspecifiedSupported } from '../section/helpers';
import { OHRITooltip } from '../inputs/tooltip/ohri-tooltip.component';
import styles from '../section/ohri-form-section.scss';

export interface ObsGroupProps extends OHRIFormFieldProps {
  deleteControl?: any;
}

export const OHRIObsGroup: React.FC<ObsGroupProps> = ({ question, onChange, deleteControl }) => {
  const [groupMembersControlMap, setGroupMembersControlMap] = useState([]);
  const { formFieldHandlers } = useContext(OHRIFormContext);

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

        return (
          <div className={classNames(styles.flexColumn, styles.obsGroupColumn)}>
            <div className={styles.parentResizer}>
              {questionFragment}
              <div
                className={classNames({
                  [styles.tooltipWithUnspecified]: isUnspecifiedSupported(field),
                  [styles.tooltip]: !isUnspecifiedSupported(field),
                })}>
                {isUnspecifiedSupported(field) && (
                  <OHRIUnspecified question={field} onChange={onChange} handler={formFieldHandlers[field.type]} />
                )}
                {field.questionInfo && <OHRITooltip field={field} />}
              </div>
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
