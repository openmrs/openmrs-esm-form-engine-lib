import React, { useContext, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useField } from 'formik';
import { FormContext } from '../../form-context';
import { type FormFieldProps } from '../../types';
import { getFieldControlWithFallback, isUnspecifiedSupported } from '../section/helpers';
import Tooltip from '../inputs/tooltip/tooltip.component';
import UnspecifiedField from '../inputs/unspecified/unspecified.component';
import styles from '../section/form-section.scss';

export const ObsGroup: React.FC<FormFieldProps> = ({ question, onChange }) => {
  const [groupMembersControlMap, setGroupMembersControlMap] = useState([]);
  const { formFieldHandlers } = useContext(FormContext);

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
      const keyId = groupMemberMapItem.field.id + '_' + index;
      const { control: FieldComponent, field } = groupMemberMapItem;
      const rendering = field.questionOptions.rendering;
      if (FieldComponent) {
        return (
          <div className={classNames(styles.flexColumn, styles.obsGroupColumn)} key={keyId}>
            <div className={styles.parentResizer}>
              <div
                className={classNames({
                  [styles.questionInfoDefault]: field.questionInfo && rendering === 'radio',
                  [styles.questionInfoCentralized]: field.questionInfo && rendering !== 'radio',
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
                  <FieldComponent
                    question={field}
                    onChange={onChange}
                    key={index}
                    handler={formFieldHandlers[field.type]}
                    useField={useField}
                  />
                </div>
                {field.questionInfo && (
                  <div className={styles.questionInfoControl}>
                    <Tooltip field={field} />
                  </div>
                )}
              </div>
              <div>
                {isUnspecifiedSupported(field) && (
                  <UnspecifiedField question={field} onChange={onChange} handler={formFieldHandlers[field.type]} />
                )}
              </div>
            </div>
          </div>
        );
      }
    });

  return <div className={styles.flexRow}>{groupContent}</div>;
};

export default ObsGroup;
