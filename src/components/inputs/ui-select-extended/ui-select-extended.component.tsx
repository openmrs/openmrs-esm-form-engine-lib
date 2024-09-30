import React, { useEffect, useMemo, useRef, useState } from 'react';
import debounce from 'lodash-es/debounce';
import { ComboBox, DropdownSkeleton, Layer } from '@carbon/react';
import { isTrue } from '../../../utils/boolean-utils';
import { useTranslation } from 'react-i18next';
import { getRegisteredDataSource } from '../../../registry/registry';
import { getControlTemplate } from '../../../registry/inbuilt-components/control-templates';
import { type FormFieldInputProps } from '../../../types';
import { isEmpty } from '../../../validators/form-validator';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import styles from './ui-select-extended.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import FieldLabel from '../../field-label/field-label.component';
import useDataSourceDependentValue from '../../../hooks/useDatasourceDependentValue';
import { useWatch } from 'react-hook-form';

const UiSelectExtended: React.FC<FormFieldInputProps> = ({ field, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const isProcessingSelection = useRef(false);
  const [dataSource, setDataSource] = useState(null);
  const [config, setConfig] = useState({});
  const [savedSearchableItem, setSavedSearchableItem] = useState({});
  const dataSourceDependentValue = useDataSourceDependentValue(field);
  const {
    layoutType,
    sessionMode,
    workspaceLayout,
    methods: { control },
  } = useFormProviderContext();

  const value = useWatch({ control, name: field.id, exact: true });

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  useEffect(() => {
    const dataSource = field.questionOptions?.datasource?.name;
    setConfig(
      dataSource
        ? field.questionOptions.datasource?.config
        : getControlTemplate(field.questionOptions.rendering)?.datasource?.config,
    );
    getRegisteredDataSource(dataSource ? dataSource : field.questionOptions.rendering).then((ds) => setDataSource(ds));
  }, [field.questionOptions?.datasource]);

  const selectedItem = useMemo(() => items.find((item) => item.uuid == value), [items, value]);

  const debouncedSearch = debounce((searchTerm, dataSource) => {
    setItems([]);
    setIsLoading(true);
    dataSource
      .fetchData(searchTerm, config)
      .then((dataItems) => {
        setItems(dataItems.map(dataSource.toUuidAndDisplay));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
        setItems([]);
      });
  }, 300);

  const processSearchableValues = (value) => {
    dataSource
      .fetchData(null, config, value)
      .then((dataItem) => {
        setSavedSearchableItem(dataItem);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
        setItems([]);
      });
  };

  useEffect(() => {
    // If not searchable, preload the items
    if (dataSource && !isTrue(field.questionOptions.isSearchable)) {
      setItems([]);
      setIsLoading(true);
      dataSource
        .fetchData(null, { ...config, referencedValue: dataSourceDependentValue })
        .then((dataItems) => {
          setItems(dataItems.map(dataSource.toUuidAndDisplay));
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
          setItems([]);
        });
    }
  }, [dataSource, config, dataSourceDependentValue]);

  useEffect(() => {
    if (dataSource && isTrue(field.questionOptions.isSearchable) && !isEmpty(searchTerm)) {
      debouncedSearch(searchTerm, dataSource);
    }
  }, [dataSource, searchTerm, config]);

  useEffect(() => {
    if (
      dataSource &&
      isTrue(field.questionOptions.isSearchable) &&
      isEmpty(searchTerm) &&
      value &&
      !Object.keys(savedSearchableItem).length
    ) {
      setIsLoading(true);
      processSearchableValues(value);
    }
  }, [value]);

  if (isLoading) {
    return <DropdownSkeleton />;
  }

  return sessionMode == 'view' || sessionMode == 'embedded-view' || isTrue(field.readonly) ? (
    <FieldValueView
      label={t(field.label)}
      value={value ? items.find((item) => item.uuid == value)?.display : value}
      conceptName={field.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !field.isHidden && (
      <div className={styles.boldedLabel}>
        <Layer>
          <ComboBox
            id={field.id}
            titleText={<FieldLabel field={field} />}
            items={items}
            itemToString={(item) => item?.display}
            selectedItem={selectedItem}
            shouldFilterItem={({ item, inputValue }) => {
              if (!inputValue) {
                // Carbon's initial call at component mount
                return true;
              }
              return item.display?.toLowerCase().includes(inputValue.toLowerCase());
            }}
            onChange={({ selectedItem }) => {
              isProcessingSelection.current = true;
              setFieldValue(selectedItem?.uuid);
            }}
            disabled={field.isDisabled}
            readOnly={isTrue(field.readonly)}
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
              if (field.questionOptions['isSearchable']) {
                setSearchTerm(value);
              }
            }}
            onBlur={(event) => {
              // Notes:
              // There is an issue with the onBlur event where the value is not persistently set to null when the user clears the input field.
              // This is a workaround to ensure that the value is set to null when the user clears the input field.
              if (!event.target.value) {
                setFieldValue(null);
              }
            }}
          />
        </Layer>
      </div>
    )
  );
};

export default UiSelectExtended;
