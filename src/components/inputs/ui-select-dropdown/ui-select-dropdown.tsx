import React, { useEffect, useState } from 'react';
import { Dropdown } from '@carbon/react';
import { DataSourceItem, OHRIFormField } from '../../../api/types';
import { useField } from 'formik';
import styles from '../_input.scss';
import { OHRIFormContext } from '../../../ohri-form-context';
import { getConceptNameAndUUID } from '../../../utils/ohri-form-helper';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { isTrue } from '../../../utils/boolean-utils';

interface UISelectDropdownProps {
  displayTitle: string;
  question: OHRIFormField;
  dataSourceItems: Array<DataSourceItem>;
  defaultValue?: any;
  onChange?: any; // TODO - this might need to be deprecated
}

export const UISelectDropdown: React.FC<UISelectDropdownProps> = ({
  displayTitle,
  question,
  dataSourceItems,
  defaultValue,
  onChange,
}) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext } = React.useContext(OHRIFormContext);
  const [conceptName, setConceptName] = useState('Loading...');

  useEffect(() => {
    getConceptNameAndUUID(question.questionOptions.concept).then(conceptTooltip => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName]);

  return encounterContext.sessionMode == 'view' || isTrue(question.readonly) ? (
    <div className={styles.formField}>
      <OHRIFieldValueView
        label={question.label}
        value={field.value ? field.value.display : field.value}
        conceptName={conceptName}
        isInline
      />
    </div>
  ) : (
    !question.isHidden && (
      <div className={`${styles.formInputField} ${styles.multiselectOverride} ${styles.flexRow}`}>
        <Dropdown
          id={question.id}
          titleText={question.label}
          label={displayTitle}
          items={dataSourceItems}
          itemToString={item => item.display}
          selectedItem={field.value}
          onChange={({ selectedItem }) => {
            setFieldValue(question.id, selectedItem);
          }}
          disabled={question.disabled}
        />
      </div>
    )
  );
};
