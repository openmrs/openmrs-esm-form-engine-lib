import React, { useContext, useEffect, useState } from 'react';
import { getHandler } from '../../registry/registry';
import { OHRIFormContext } from '../../ohri-form-context';
import { OHRIFormFieldProps } from '../../api/types';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import { getFieldControl, supportsUnspecified } from '../section/ohri-form-section.component';
import styles from './ohri-obs-group.scss';

export interface ObsGroupProps extends OHRIFormFieldProps {
  deleteControl?: any;
}

export const OHRIObsGroup: React.FC<ObsGroupProps> = ({ question, onChange, deleteControl }) => {
  const [groupMembersControlMap, setGroupMembersControlMap] = useState([]);
  const { encounterContext } = useContext(OHRIFormContext);

  useEffect(() => {
    if (question.questions) {
      Promise.all(
        question.questions.map(field => {
          return getFieldControl(field)?.then(result => ({ field, control: result.default }));
        }),
      ).then(results => {
        setGroupMembersControlMap(results);
      });
    }
  }, [question.questions]);
  const groupContent = groupMembersControlMap
    .filter(groupMemberMapItem => !!groupMemberMapItem && !groupMemberMapItem.field.isHidden)
    .map((groupMemberMapItem, index) => {
      const { control, field } = groupMemberMapItem;
      if (control) {
        const questionFragment = React.createElement(control, {
          question: field,
          onChange: onChange,
          key: index,
          handler: getHandler(field.type),
        });
        return (
          <div className={`${styles.flexColumn} ${styles.obsGroupColumn} `}>
            {supportsUnspecified(field) ? (
              <>
                {questionFragment}
                <OHRIUnspecified question={field} />
              </>
            ) : (
              questionFragment
            )}
          </div>
        );
      }
    });
  if (groupContent && deleteControl) {
    groupContent.push(deleteControl);
  }
  return <div className={styles.flexRow}>{groupContent}</div>;
};
