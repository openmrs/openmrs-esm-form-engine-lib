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
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import styles from './date.scss';
import { useFieldValidationResults } from '../../../hooks/useFieldValidationResults';
import { OpenmrsDatePicker, formatDate, formatTime } from '@openmrs/esm-framework';

const locale = window.i18next.language == 'en' ? 'en-GB' : window.i18next.language;
const dateFormatter = new Intl.DateTimeFormat(locale);

const DateField: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, fields } = React.useContext(FormContext);
  const [time, setTime] = useState('');
  const { errors, warnings, setErrors, setWarnings } = useFieldValidationResults(question);
  const datePickerType = 'single';

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  const onDateChange = ([date]) => {
    const refinedDate = date instanceof Date ? new Date(date.setHours(0, 0, 0, 0)) : date;
    setFieldValue(question.id, refinedDate);
    onChange(question.id, refinedDate, setErrors, setWarnings);
    onTimeChange(false, true);
    handler?.handleFieldSubmission(question, refinedDate, encounterContext);
  };

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const refinedDate = previousValue instanceof Date ? new Date(previousValue.setHours(0, 0, 0, 0)) : previousValue;
      setFieldValue(question.id, refinedDate);
      onChange(question.id, refinedDate, setErrors, setWarnings);
      onTimeChange(false, true);
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
      const currentDateTime = field.value;
      const splitTime = time.split(':');
      currentDateTime.setHours(splitTime[0] ?? '00', splitTime[1] ?? '00');
      setFieldValue(question.id, currentDateTime);
      onChange(question.id, currentDateTime, setErrors, setWarnings);
      handler?.handleFieldSubmission(question, currentDateTime, encounterContext);
      setTime(time);
    }
  };
  const { placeholder, carbonDateFormat } = useMemo(() => {
    const formatObj = dateFormatter.formatToParts(new Date());
    const placeholder = formatObj
      .map((obj) => {
        switch (obj.type) {
          case 'day':
            return 'dd';
          case 'month':
            return 'mm';
          case 'year':
            return 'yyyy';
          default:
            return obj.value;
        }
      })
      .join('');
    const carbonDateFormat = formatObj
      .map((obj) => {
        switch (obj.type) {
          case 'day':
            return 'd';
          case 'month':
            return 'm';
          case 'year':
            return 'Y';
          default:
            return obj.value;
        }
      })
      .join('');
    return { placeholder: placeholder, carbonDateFormat: carbonDateFormat };
  }, []);

  useEffect(() => {
    if (!time && field.value) {
      if (field.value instanceof Date) {
        const hours = field.value.getHours() < 10 ? `0${field.value.getHours()}` : `${field.value.getHours()}`;
        const minutes = field.value.getMinutes() < 10 ? `0${field.value.getMinutes()}` : `${field.value.getMinutes()}`;
        setTime([hours, minutes].join(':'));
      }
    }
  }, [field.value, time]);

  return encounterContext.sessionMode == 'view' || encounterContext.sessionMode == 'embedded-view' ? (
    <FieldValueView
      label={t(question.label)}
      value={field.value instanceof Date ? getDisplay(field.value, question.questionOptions.rendering) : field.value}
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
                  dateFormat={carbonDateFormat}
                  onChange={(date) => onDateChange([date])}
                  labelText={
                    question.isRequired ? (
                      <RequiredFieldLabel label={t(question.label)} />
                    ) : (
                      <span>{t(question.label)}</span>
                    )
                  }
                  invalid={errors.length > 0}
                  invalidText={errors[0]?.message}
                  value={field.value}
                  disabled={question.isDisabled}
                  readonly={isTrue(question.readonly)}
                  carbonOptions={{
                    placeholder: placeholder,
                    warn: warnings[0]?.message,
                    warnText: warnings[0]?.message,
                    className: styles.boldedLabel,
                    datePickerType: datePickerType,
                  }}
                />
              </Layer>
            </div>
          )}

          {question.datePickerFormat === 'both' || question.datePickerFormat === 'timer' ? (
            <div>
              <Layer>
                <TimePicker
                  className={classNames(styles.boldedLabel, styles.timeInput)}
                  id={question.id}
                  labelText={<RequiredFieldLabel label={t('time', 'Time')} />}
                  placeholder="HH:MM"
                  pattern="(1[012]|[1-9]):[0-5][0-9])$"
                  type="time"
                  disabled={!field.value ? true : false}
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
  if (rendering == 'datetime') {
    return `${dateString} ${formatTime(date)}`;
  }
  return dateString;
}
export default DateField;
