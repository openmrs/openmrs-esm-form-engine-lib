import React, { useEffect, useState } from 'react';
import { getHandler } from '../../registry/registry';
import { OHRIFormFieldProps } from '../../api/types';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import styles from '../inputs/_input.scss';
import { getFieldControl, supportsUnspecified } from '../section/ohri-form-section.component';
import { OHRIFormContext } from '../../ohri-form-context';
export interface ObsGroupProps extends OHRIFormFieldProps {
  deleteControl?: any;
}

export const OHRIObsGroup: React.FC<ObsGroupProps> = ({ question, onChange, deleteControl }) => {
  const [groupMembersControlMap, setGroupMembersControlMap] = useState([]);
  const { encounterContext } = React.useContext(OHRIFormContext);

  useEffect(() => {
    Promise.all(
      question.questions.map(field => {
        return getFieldControl(field)?.then(result => ({ field, control: result.default }));
      }),
    ).then(results => {
      setGroupMembersControlMap(results);
    });
  }, [question.questions]);
  const groupContent = groupMembersControlMap
    .filter(groupMemberMapItem => !!groupMemberMapItem && !groupMemberMapItem.field.isHidden)
    .map((groupMemberMapItem, index) => {
      const { control, field } = groupMemberMapItem;
      if (control) {
        const qnFragment = React.createElement(control, {
          question: field,
          onChange: onChange,
          key: index,
          handler: getHandler(field.type),
        });
        return (
          <div className={`${styles.flexColumn} ${styles.obsGroupColumn} `}>
            {supportsUnspecified(field) ? (
              <>
                {qnFragment}
                <OHRIUnspecified question={field} />
              </>
            ) : (
              qnFragment
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
