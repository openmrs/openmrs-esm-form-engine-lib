import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useField } from 'formik';
import { Layer, TimePicker } from '@carbon/react';
import classNames from 'classnames';
import { type FormFieldProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { isInlineView } from '../../../utils/form-helper';
import { isEmpty } from '../../../validators/form-validator';
import { FormContext } from '../../../form-context';
import FieldValueView from '../../value/view/field-value-view.component';
import FieldLabel from '../../field-label/field-label.component';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';
import { OpenmrsDatePicker, formatDate, formatTime } from '@openmrs/esm-framework';
import { type CalendarDate, getLocalTimeZone } from '@internationalized/date';

import styles from './date.scss';

const DateField: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const { t } = useTranslation();
  const [field] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, fields } = React.useContext(FormContext);
  const [time, setTime] = useState('');
  const { errors, setErrors, warnings, setWarnings } = useFieldValidationResults(question);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  const onDateChange = (date: CalendarDate) => {
    const refinedDate = date.toDate(getLocalTimeZone());
    setTimeIfPresent(refinedDate, time);
    setFieldValue(question.id, refinedDate);
    onChange(question.id, refinedDate, setErrors, setWarnings);
    handler?.handleFieldSubmission(question, refinedDate, encounterContext);
  };

  const setTimeIfPresent = (date: Date, time: string) => {
    if (!isEmpty(time)) {
      const [hours, minutes] = time.split(':').map(Number);
      date.setHours(hours ?? 0, minutes ?? 0);
    }
  };

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const refinedDate = new Date(previousValue.toString());
      onTimeChange(false, true);
      setFieldValue(question.id, refinedDate);
      onChange(question.id, refinedDate, setErrors, setWarnings);
      handler?.handleFieldSubmission(question, refinedDate, encounterContext);
    }
  }, [previousValue]);

  const onTimeChange = (event, useValue = false) => {
    if (useValue) {
      const prevValue =
        encounterContext?.previousEncounter &&
        handler?.getPreviousValue(question, encounterContext?.previousEncounter, fields);
      setTime(dayjs(prevValue?.value).format('hh:mm'));
    } else {
      const time = event.target.value;
      setTime(time);
      const dateValue = question.datePickerFormat === 'timer' ? new Date() : field.value;
      setTimeIfPresent(dateValue, time);
      setFieldValue(question.id, dateValue);
      onChange(question.id, dateValue, setErrors, setWarnings);
      handler?.handleFieldSubmission(question, dateValue, encounterContext);
    }
  };

  useEffect(() => {
    if (!time && field.value) {
      if (field.value instanceof Date) {
        const hours = field.value.getHours() < 10 ? `0${field.value.getHours()}` : `${field.value.getHours()}`;
        const minutes = field.value.getMinutes() < 10 ? `0${field.value.getMinutes()}` : `${field.value.getMinutes()}`;
        setTime([hours, minutes].join(':'));
      }
    }
  }, [field.value, time]);

  const timePickerLabel = useMemo(
    () =>
      question.datePickerFormat === 'timer' ? (
        <FieldLabel field={question} />
      ) : (
        <FieldLabel field={question} customLabel={t('time', 'Time')} />
      ),
    [question.datePickerFormat, question.label, t],
  );

  return encounterContext.sessionMode == 'view' || encounterContext.sessionMode == 'embedded-view' ? (
    <FieldValueView
      label={t(question.label)}
      value={field.value instanceof Date ? getDisplay(field.value, question.datePickerFormat) : field.value}
      conceptName={question.meta?.concept?.display}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <>
        <div className={styles.datetime}>
          {(question.datePickerFormat === 'calendar' || question.datePickerFormat === 'both') && (
            <div className={styles.datePickerSpacing}>
              <Layer>
                <OpenmrsDatePicker
                  id={question.id}
                  onChange={onDateChange}
                  labelText={timePickerLabel}
                  isDisabled={question.isDisabled}
                  isReadOnly={isTrue(question.readonly)}
                  isRequired={question.isRequired ?? false}
                  isInvalid={errors.length > 0}
                  invalidText={errors[0]?.message}
                  value={field.value}
                />
              </Layer>
              {warnings.length > 0 ? <div className={styles.datePickerWarn}>{warnings[0]?.message}</div> : null}
            </div>
          )}

          {question.datePickerFormat === 'both' || question.datePickerFormat === 'timer' ? (
            <div>
              <Layer>
                <TimePicker
                  className={classNames(styles.boldedLabel, styles.timeInput)}
                  id={question.id}
                  labelText={
                    question.isRequired ? (
                      <FieldLabel
                        customLabel={question.datePickerFormat === 'timer' ? t(question.label) : t('time', 'Time')}
                        field={undefined}
                      />
                    ) : (
                      <span>{question.datePickerFormat === 'timer' ? t(question.label) : t('time', 'Time')}</span>
                    )
                  }
                  placeholder="HH:MM"
                  pattern="(1[012]|[1-9]):[0-5][0-9])$"
                  type="time"
                  disabled={question.datePickerFormat === 'timer' ? question.isDisabled : !field.value ? true : false}
                  invalid={errors.length > 0}
                  invalidText={errors[0]?.message}
                  warning={warnings.length > 0}
                  warningText={warnings[0]?.message}
                  value={
                    time
                      ? time
                      : field.value instanceof Date
                      ? field.value.toLocaleDateString(window.navigator.language)
                      : field.value
                  }
                  onChange={onTimeChange}
                />
              </Layer>
            </div>
          ) : (
            ''
          )}
        </div>
      </>
    )
  );
};

function getDisplay(date: Date, rendering: string) {
  const dateString = formatDate(date);
  if (rendering == 'both') {
    return `${dateString} ${formatTime(date)}`;
  }
  return dateString;
}

export default DateField;
