import React, { useContext, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useField } from 'formik';
import { FormContext } from '../../form-context';
import { FormFieldProps } from '../../types';
import { getFieldControlWithFallback, isUnspecifiedSupported } from '../section/helpers';
import { UnspecifiedField } from '../inputs/unspecified/unspecified.component';
import styles from './obs-group.scss';
import { Tooltip } from '../inputs/tooltip/tooltip.component';

export interface ObsGroupProps extends FormFieldProps {
  deleteControl?: any;
}

export const ObsGroup: React.FC<ObsGroupProps> = ({ question, onChange, deleteControl }) => {
  const [groupMembersControlMap, setGroupMembersControlMap] = useState([]);
  const { encounterContext, formFieldHandlers } = useContext(FormContext);

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
      const keyId = groupMemberMapItem.field.id + '-' + index;
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
          <div className={classNames(styles.flexColumn, styles.obsGroupColumn)} key={keyId}>
            <div className={styles.parentResizer}>
              {questionFragment}
              <div
                className={classNames({
                  [styles.tooltipWithUnspecified]: isUnspecifiedSupported(field),
                  [styles.tooltip]: !isUnspecifiedSupported(field),
                })}>
                {isUnspecifiedSupported(field) && (
                  <UnspecifiedField question={field} onChange={onChange} handler={formFieldHandlers[field.type]} />
                )}
                {field.questionInfo && <Tooltip field={field} />}
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
