import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, TimePicker } from '@carbon/react';
import classNames from 'classnames';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import { isEmpty } from '../../../validators/form-validator';
import FieldValueView from '../../value/view/field-value-view.component';
import styles from './date.scss';
import { OpenmrsDatePicker, formatDate, formatTime } from '@openmrs/esm-framework';
import { useFormProviderContext } from '../../../provider/form-provider';
import FieldLabel from '../../field-label/field-label.component';

// Helper function to validate date
const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime());

const DateField: React.FC<FormFieldInputProps> = ({ field, value: dateValue, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const [time, setTime] = useState('');
  const { layoutType, sessionMode, workspaceLayout } = useFormProviderContext();
  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  const onDateChange = useCallback(
    (date: Date) => {
      if (isValidDate(date)) {
        setTimeIfPresent(date, time);
        setFieldValue(date);
      } else {
        setFieldValue(null);
      }
    },
    [setFieldValue, time],
  );

  const setTimeIfPresent = useCallback((date: Date, time: string) => {
    if (!isEmpty(time)) {
      const [hours, minutes] = time.split(':').map(Number);
      date.setHours(hours ?? 0, minutes ?? 0);
    }
  }, []);

  const onTimeChange = useCallback(
    (event) => {
      const time = event.target.value;
      setTime(time);
      const date = field.datePickerFormat === 'timer' ? new Date() : new Date(dateValue ?? Date.now());
      setTimeIfPresent(date, time);
      setFieldValue(date);
    },
    [setFieldValue, setTimeIfPresent, dateValue],
  );

  useEffect(() => {
    if (dateValue) {
      if (isValidDate(dateValue)) {
        const hours = dateValue.getHours() < 10 ? `0${dateValue.getHours()}` : `${dateValue.getHours()}`;
        const minutes = dateValue.getMinutes() < 10 ? `0${dateValue.getMinutes()}` : `${dateValue.getMinutes()}`;
        setTime([hours, minutes].join(':'));
      }
    }
  }, [dateValue]);

  const timePickerLabel = useMemo(
    () =>
      field.datePickerFormat === 'timer' ? (
        <FieldLabel field={field} />
      ) : (
        <FieldLabel field={field} customLabel={t('time', 'Time')} />
      ),
    [field.datePickerFormat, field.label, t],
  );

  return sessionMode === 'view' || sessionMode === 'embedded-view' ? (
    <FieldValueView
      label={t(field.label)}
      value={isValidDate(dateValue) ? getDisplay(dateValue, field.datePickerFormat) : dateValue}
      conceptName={field.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !field.isHidden && (
      <div className={styles.datetime}>
        {(field.datePickerFormat === 'calendar' || field.datePickerFormat === 'both') && (
          <div className={styles.datePickerSpacing}>
            <Layer>
              <OpenmrsDatePicker
                id={field.id}
                onChange={onDateChange}
                labelText={
                  <span className={styles.datePickerLabel}>
                    <FieldLabel field={field} />
                  </span>
                }
                isDisabled={field.isDisabled}
                isReadOnly={isTrue(field.readonly)}
                isRequired={field.isRequired ?? false}
                isInvalid={errors.length > 0}
                invalidText={errors[0]?.message}
                value={isValidDate(dateValue) ? dateValue : null} // Default to null if invalid date
              />
            </Layer>
            {warnings.length > 0 ? <div className={styles.datePickerWarn}>{warnings[0]?.message}</div> : null}
          </div>
        )}

        {(field.datePickerFormat === 'both' || field.datePickerFormat === 'timer') && (
          <div>
            <Layer>
              <TimePicker
                className={classNames(styles.boldedLabel, styles.timeInput)}
                id={field.id}
                labelText={timePickerLabel}
                placeholder="HH:MM"
                pattern="(1[012]|[1-9]):[0-5][0-9])$"
                type="time"
                disabled={field.datePickerFormat === 'timer' ? field.isDisabled : !isValidDate(dateValue)}
                invalid={errors.length > 0}
                invalidText={errors[0]?.message}
                warning={warnings.length > 0}
                warningText={warnings[0]?.message}
                value={time || ''}
                onChange={onTimeChange}
              />
            </Layer>
          </div>
        )}
      </div>
    )
  );
};

function getDisplay(date: Date, rendering: string) {
  const dateString = formatDate(date);
  if (rendering === 'both') {
    return `${dateString} ${formatTime(date)}`;
  }
  return dateString;
}

export default DateField;
