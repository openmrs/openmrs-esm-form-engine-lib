import { Column, Row } from 'carbon-components-react/lib/components/Grid';
import React from 'react';
import { getFieldComponent, getHandler } from '../../registry/registry';
import { OHRIFormFieldProps } from '../../types';
import { OHRIUnspecified } from '../inputs/unspecified/ohri-unspecified.component';
import styles from '../inputs/_input.scss';
import { getFieldControl, supportsUnspecified } from '../section/ohri-form-section.component';
export interface ObsGroupProps extends OHRIFormFieldProps {
  deleteControl?: any;
}

export const OHRIObsGroup: React.FC<ObsGroupProps> = ({ question, onChange, deleteControl }) => {
  const groupContent = question.questions
    .filter(groupMember => !groupMember.isHidden)
    .map((groupMember, index) => {
      const component = getFieldControl(groupMember);
      if (component) {
        const qnFragment = React.createElement(component, {
          question: groupMember,
          onChange: onChange,
          key: index,
          handler: getHandler(groupMember.type),
        });
        return (
          <Column className={styles.obsGroupColumn}>
            {supportsUnspecified(groupMember) ? (
              <>
                {qnFragment}
                <OHRIUnspecified question={groupMember} />
              </>
            ) : (
              qnFragment
            )}
          </Column>
        );
      }
    });
  if (groupContent) {
    groupContent.push(deleteControl);
  }
  return <Row>{groupContent}</Row>;
};
