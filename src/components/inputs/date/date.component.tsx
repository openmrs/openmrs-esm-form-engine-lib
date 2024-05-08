import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useField } from 'formik';
import { DatePicker, DatePickerInput, Layer, TimePicker } from '@carbon/react';
import { formatDate } from '@openmrs/esm-framework';
import { isTrue } from '../../../utils/boolean-utils';
import { type FormFieldProps } from '../../../types';
import { isInlineView } from '../../../utils/form-helper';
import { isEmpty } from '../../../validators/form-validator';
import { FormContext } from '../../../form-context';
import FieldValueView from '../../value/view/field-value-view.component';
import RequiredFieldLabel from '../../required-field-label/required-field-label.component';
import styles from './date.scss';

const locale = window.i18next.language == 'en' ? 'en-GB' : window.i18next.language;
const dateFormatter = new Intl.DateTimeFormat(locale);

const DateField: React.FC<FormFieldProps> = ({ question, onChange, handler, previousValue }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, fields } = React.useContext(FormContext);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [previousValueForReview, setPreviousValueForReview] = useState(null);
  const [time, setTime] = useState('');

  useEffect(() => {
    if (question['submission']) {
      question['submission'].errors && setErrors(question['submission'].errors);
      question['submission'].warnings && setWarnings(question['submission'].warnings);
    }
  }, [question['submission']]);

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
    question.value = handler?.handleFieldSubmission(question, refinedDate, encounterContext);
  };

  useEffect(() => {
    if (!isEmpty(previousValue)) {
      const date = previousValue.value;
      const refinedDate = date instanceof Date ? new Date(date.setHours(0, 0, 0, 0)) : date;
      setFieldValue(question.id, refinedDate);
      onChange(question.id, refinedDate, setErrors, setWarnings);
      onTimeChange(false, true);
      question.value = handler?.handleFieldSubmission(question, refinedDate, encounterContext);
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
      question.value = handler?.handleFieldSubmission(question, currentDateTime, encounterContext);
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
    if (encounterContext?.previousEncounter && !isTrue(question.questionOptions.usePreviousValueDisabled)) {
      let prevValue = handler?.getPreviousValue(question, encounterContext?.previousEncounter, fields);

      if (!isEmpty(prevValue?.value)) {
        if (question?.questionOptions.rendering === 'datetime') {
          const rawDate = new Date(prevValue.value);

          prevValue = {
            display: formatDate(prevValue.value, { mode: 'wide' }),
            value: [rawDate],
          };
        } else {
          prevValue.display = dateFormatter.format(prevValue.value);
          prevValue.value = [prevValue.value];
        }
        setPreviousValueForReview(prevValue);
      }
    }
  }, [encounterContext?.previousEncounter]);

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
          <div>
            <Layer>
              <DatePicker
                datePickerType="single"
                onChange={onDateChange}
                className={classNames(styles.boldedLabel)}
                dateFormat={carbonDateFormat}>
                <DatePickerInput
                  id={question.id}
                  placeholder={placeholder}
                  labelText={
                    question.required ? (
                      <RequiredFieldLabel label={t(question.label)} />
                    ) : (
                      <span>{t(question.label)}</span>
                    )
                  }
                  value={field.value instanceof Date ? field.value.toLocaleDateString(locale) : field.value}
                  // Added for testing purposes.
                  // Notes:
                  // Something strange is happening with the way events are propagated and handled by Carbon.
                  // When we manually trigger an onchange event using the 'fireEvent' lib, the handler below will
                  // be triggered as opposed to the former handler that only gets triggered at runtime.
                  onChange={(e) => onDateChange([dayjs(e.target.value, placeholder.toUpperCase()).toDate()])}
                  disabled={question.disabled}
                  invalid={errors.length > 0}
                  invalidText={errors[0]?.message}
                  warn={warnings.length > 0}
                  warnText={warnings[0]?.message}
                  readOnly={question.readonly}
                />
              </DatePicker>
            </Layer>
          </div>
          {question?.questionOptions.rendering === 'datetime' ? (
            <div className={styles.timePickerSpacing}>
              <Layer>
                <TimePicker
                  className={styles.boldedLabel}
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
  const dateString = date.toLocaleDateString(window.navigator.language);
  if (rendering == 'datetime') {
    return `${dateString} ${date.toLocaleTimeString()}`;
  }
  return dateString;
}
export default DateField;
