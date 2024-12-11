import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash-es';
import { ComboBox, DropdownSkeleton, Layer, InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useWatch } from 'react-hook-form';
import { type OpenmrsResource } from '@openmrs/esm-framework';
import { getControlTemplate } from '../../../registry/inbuilt-components/control-templates';
import { getRegisteredDataSource } from '../../../registry/registry';
import { isEmpty } from '../../../validators/form-validator';
import { isTrue } from '../../../utils/boolean-utils';
import { isViewMode } from '../../../utils/common-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import { type DataSource, type FormFieldInputProps } from '../../../types';
import { useFormProviderContext } from '../../../provider/form-provider';
import useDataSourceDependentValue from '../../../hooks/useDataSourceDependentValue';
import FieldLabel from '../../field-label/field-label.component';
import FieldValueView from '../../value/view/field-value-view.component';
import styles from './ui-select-extended.scss';

const UiSelectExtended: React.FC<FormFieldInputProps> = ({ field, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const isProcessingSelection = useRef(false);
  const [dataSource, setDataSource] = useState(null);
  const [config, setConfig] = useState({});
  const dataSourceDependentValue = useDataSourceDependentValue(field);
  const isSearchable = isTrue(field.questionOptions.isSearchable);
  const {
    layoutType,
    sessionMode,
    workspaceLayout,
    methods: { control, getFieldState },
  } = useFormProviderContext();

  const value = useWatch({ control, name: field.id, exact: true });
  const { isDirty } = getFieldState(field.id);

  const isInline = useMemo(() => {
    if (isViewMode(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  const selectedItem = useMemo(() => items.find((item) => item.uuid == value) || null, [items, value]);

  const debouncedSearch = debounce((searchTerm: string, dataSource: DataSource<OpenmrsResource>) => {
    setIsSearching(true);

    dataSource
      .fetchData(searchTerm, config)
      .then((dataItems) => {
        if (dataItems.length) {
          const currentSelectedItem = items.find((item) => item.uuid == value);
          const newItems = dataItems.map(dataSource.toUuidAndDisplay);
          if (currentSelectedItem && !newItems.some((item) => item.uuid == currentSelectedItem.uuid)) {
            newItems.unshift(currentSelectedItem);
          }
          setItems(newItems);
        }
        setIsSearching(false);
      })
      .catch((err) => {
        console.error(err);
        setIsSearching(false);
      });
  }, 300);

  const searchTermHasMatchingItem = useCallback(
    (searchTerm: string) => {
      return items.some((item) => item.display?.toLowerCase().includes(searchTerm.toLowerCase()));
    },
    [items],
  );

  useEffect(() => {
    const dataSource = field.questionOptions?.datasource?.name;
    setConfig(
      dataSource
        ? field.questionOptions.datasource?.config
        : getControlTemplate(field.questionOptions.rendering)?.datasource?.config,
    );
    getRegisteredDataSource(dataSource ? dataSource : field.questionOptions.rendering).then((ds) => setDataSource(ds));
  }, [field.questionOptions?.datasource]);

  useEffect(() => {
    let ignore = false;

    // If not searchable, preload the items
    if (dataSource && !isTrue(field.questionOptions.isSearchable)) {
      setItems([]);
      setIsLoading(true);

      dataSource
        .fetchData(null, { ...config, referencedValue: dataSourceDependentValue })
        .then((dataItems) => {
          if (!ignore) {
            setItems(dataItems.map(dataSource.toUuidAndDisplay));
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!ignore) {
            console.error(err);
            setIsLoading(false);
            setItems([]);
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [dataSource, config, dataSourceDependentValue]);

  useEffect(() => {
    if (dataSource && isSearchable && !isEmpty(searchTerm) && !searchTermHasMatchingItem(searchTerm)) {
      debouncedSearch(searchTerm, dataSource);
    }
  }, [dataSource, searchTerm, config]);

  useEffect(() => {
    let ignore = false;
    if (value && !isDirty && dataSource && isSearchable && sessionMode !== 'enter' && !items.length) {
      // While in edit mode, search-based instances should fetch the initial item (previously selected value) to resolve its display property
      setIsLoading(true);
      try {
        dataSource.fetchSingleItem(value).then((item) => {
          if (!ignore) {
            setItems([dataSource.toUuidAndDisplay(item)]);
            setIsLoading(false);
          }
        });
      } catch (error) {
        if (!ignore) {
          console.error(error);
          setIsLoading(false);
        }
      }
    }

    return () => {
      ignore = true;
    };
  }, [value, isDirty, sessionMode, dataSource, isSearchable, items]);

  if (isLoading) {
    return <DropdownSkeleton />;
  }

  return isViewMode(sessionMode) || isTrue(field.readonly) ? (
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
            placeholder={isSearchable ? t('search', 'Search') + '...' : null}
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
              if (field.questionOptions.isSearchable) {
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
          {isSearching && <InlineLoading className={styles.loader} description={t('searching', 'Searching') + '...'} />}
        </Layer>
      </div>
    )
  );
};

export default UiSelectExtended;
