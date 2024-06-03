import React, { useEffect, useMemo, useRef, useState } from 'react';
import debounce from 'lodash-es/debounce';
import { ComboBox, DropdownSkeleton, Layer } from '@carbon/react';
import { useField } from 'formik';
import { isTrue } from '../../../utils/boolean-utils';
import { useTranslation } from 'react-i18next';
import { getRegisteredDataSource } from '../../../registry/registry';
import { getControlTemplate } from '../../../registry/inbuilt-components/control-templates';
import { FormContext } from '../../../form-context';
import { type FormFieldProps } from '../../../types';
import { isEmpty } from '../../../validators/form-validator';
import { isInlineView } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';
import useDatasourceDependentValue from '../../../hooks/useDatasourceDependentValue';
import styles from './ui-select-extended.scss';

const UiSelectExtended: React.FC<FormFieldProps> = ({ question, handler, onChange, previousValue }) => {
  const { t } = useTranslation();
  const [field] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const isProcessingSelection = useRef(false);
  const [dataSource, setDataSource] = useState(null);
  const [config, setConfig] = useState({});
  const [savedSearchableItem, setSavedSearchableItem] = useState({});
  const { errors, setErrors, setWarnings } = useFieldValidationResults(question);
  const datasourceDependentValue = useDatasourceDependentValue(question);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  useEffect(() => {
    const dataSource = question.questionOptions?.datasource?.name;
    setConfig(
      dataSource
        ? question.questionOptions.datasource?.config
        : getControlTemplate(question.questionOptions.rendering)?.datasource?.config,
    );
    getRegisteredDataSource(dataSource ? dataSource : question.questionOptions.rendering).then((ds) =>
      setDataSource(ds),
    );
  }, [question.questionOptions?.datasource]);

  const handleChange = (value) => {
    setFieldValue(question.id, value);
    onChange(question.id, value, setErrors, setWarnings);
    handler?.handleFieldSubmission(question, value, encounterContext);
  };

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const value = previousValue;
      isProcessingSelection.current = true;
      setFieldValue(question.id, value);
      onChange(question.id, value, setErrors, setWarnings);
      handler?.handleFieldSubmission(question, value, encounterContext);
    }
  }, [previousValue]);

  const debouncedSearch = debounce((searchterm, dataSource) => {
    setItems([]);
    setIsLoading(true);
    dataSource.fetchData(searchterm, config).then((dataItems) => {
      setItems(dataItems.map(dataSource.toUuidAndDisplay));
      setIsLoading(false);
    });
  }, 300);

  const processSearchableValues = (value) => {
    dataSource.fetchData(null, config, value).then((dataItem) => {
      setSavedSearchableItem(dataItem);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    // If not searchable, preload the items
    if (dataSource && !isTrue(question.questionOptions.isSearchable)) {
      setIsLoading(true);
      dataSource.fetchData(null, { ...(config || {}), referencedValue: datasourceDependentValue }).then((dataItems) => {
        setItems(dataItems.map(dataSource.toUuidAndDisplay));
        setIsLoading(false);
      });
    }
  }, [dataSource, config, datasourceDependentValue]);

  useEffect(() => {
    if (dataSource && isTrue(question.questionOptions.isSearchable) && !isEmpty(searchTerm)) {
      debouncedSearch(searchTerm, dataSource);
    }
  }, [dataSource, searchTerm, config]);

  useEffect(() => {
    if (
      dataSource &&
      isTrue(question.questionOptions.isSearchable) &&
      isEmpty(searchTerm) &&
      field.value &&
      !Object.keys(savedSearchableItem).length
    ) {
      setIsLoading(true);
      processSearchableValues(field.value);
    }
  }, [field.value]);

  if (isLoading) {
    return <DropdownSkeleton />;
  }

  return encounterContext.sessionMode == 'view' ||
    encounterContext.sessionMode == 'embedded-view' ||
    isTrue(question.readonly) ? (
    <FieldValueView
      label={t(question.label)}
      value={
        field.value
          ? handler?.getDisplayValue(question, items.find((item) => item.uuid == field.value)?.display)
          : field.value
      }
      conceptName={question.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <div className={styles.boldedLabel}>
        <Layer>
          <ComboBox
            id={question.id}
            titleText={question.isRequired ? <RequiredFieldLabel label={t(question.label)} /> : t(question.label)}
            items={items}
            itemToString={(item) => item?.display}
            selectedItem={items.find((item) => item.uuid == field.value)}
            shouldFilterItem={({ item, inputValue }) => {
              if (!inputValue) {
                // Carbon's initial call at component mount
                return true;
              }
              return item.display?.toLowerCase().includes(inputValue.toLowerCase());
            }}
            onChange={({ selectedItem }) => {
              isProcessingSelection.current = true;
              handleChange(selectedItem?.uuid);
            }}
            disabled={question.isDisabled}
            readOnly={question.readonly}
            invalid={errors.length > 0}
            invalidText={errors.length && errors[0].message}
            onInputChange={(value) => {
              if (isProcessingSelection.current) {
                // Notes:
                // When the user selects a value, both the onChange and onInputChange functions are invoked sequentially.
                // Issue: onInputChange modifies the search term, unnecessarily triggering a search.
                isProcessingSelection.current = false;
                return;
              }
              if (question.questionOptions['isSearchable']) {
                setSearchTerm(value);
              }
            }}
          />
        </Layer>
      </div>
    )
  );
};

export default UiSelectExtended;
