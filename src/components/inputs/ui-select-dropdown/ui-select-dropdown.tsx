import React, { useEffect, useState } from 'react';
import { ComboBox } from '@carbon/react';
import { OHRIFormField } from '../../../api/types';
import { useField } from 'formik';
import styles from '../_input.scss';
import { OHRIFormContext } from '../../../ohri-form-context';
import { getConceptNameAndUUID } from '../../../utils/ohri-form-helper';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { isTrue } from '../../../utils/boolean-utils';
import { getDataSource } from '../../../registry/registry';

interface UISelectDropdownProps {
  question: OHRIFormField;
  defaultValue?: any;
  onChange?: any;
}

export const UISelectDropdown: React.FC<UISelectDropdownProps> = ({ question, defaultValue, onChange }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext } = React.useContext(OHRIFormContext);
  const [conceptName, setConceptName] = useState('Loading...');
  const [items, setItems] = useState([]);

  useEffect(() => {
    // get the data source
    if (question.questionOptions['datasource']) {
      const dataSource = getDataSource(question.questionOptions['datasource']);
      if (dataSource) {
        dataSource.fetchData().then(dataItems => {
          setItems(dataItems.map(dataSource.toUuidAndDisplay));
        });
      } else {
        // TODO: handle this case
      }
    } else {
      // TODO: Handle this case
    }
  }, []);

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
        <ComboBox
          id={question.id}
          titleText={question.label}
          items={items}
          itemToString={item => item.display}
          selectedItem={field.value}
          shouldFilterItem={({ item, inputValue }) => {
            return item.display.toLowerCase().includes(inputValue.toLowerCase());
          }}
          onChange={({ selectedItem }) => {
            setFieldValue(question.id, selectedItem);
            items
              .filter(x => x.display == selectedItem.display)
              .map(x => {
                setFieldValue(question.id, x);
              });
          }}
          disabled={question.disabled}
        />
      </div>
    )
  );
};
