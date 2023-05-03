import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useField } from 'formik';
import { DatePicker, DatePickerInput, TimePicker } from '@carbon/react';
import { fieldRequiredErrCode, isEmpty } from '../../../validators/ohri-form-validator';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { OHRIFormFieldProps } from '../../../api/types';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';
import { PreviousValueReview } from '../../previous-value-review/previous-value-review.component';
import styles from './ohri-date.scss';

const dateFormatter = new Intl.DateTimeFormat(window.navigator.language);

const OHRIDate: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout, fields } = React.useContext(OHRIFormContext);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [conceptName, setConceptName] = useState('Loading...');
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);
  const [previousValueForReview, setPreviousValueForReview] = useState(null);
  const [time, setTime] = useState('');

  useEffect(() => {
    if (question['submission']) {
      question['submission'].errors && setErrors(question['submission'].errors);
      question['submission'].warnings && setWarnings(question['submission'].warnings);
    }
  }, [question['submission']]);

  const isInline = useMemo(() => {
    if (encounterContext.sessionMode == 'view' || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  const onDateChange = ([date]) => {
    const refinedDate = date instanceof Date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000) : date;
    setFieldValue(question.id, refinedDate);
    onChange(question.id, refinedDate, setErrors, setWarnings);
    onTimeChange(false, true);
    question.value = handler?.handleFieldSubmission(question, refinedDate, encounterContext);
  };

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
  const { placeholder, carbonDateformat } = useMemo(() => {
    const formatObj = dateFormatter.formatToParts(new Date());
    const placeholder = formatObj
      .map(obj => {
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
    const carbonDateformat = formatObj
      .map(obj => {
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
    return { placeholder: placeholder, carbonDateformat: carbonDateformat };
  }, []);

  useEffect(() => {
    if (encounterContext?.previousEncounter && !question.questionOptions.usePreviousValueDisabled) {
      let prevValue = handler?.getPreviousValue(question, encounterContext?.previousEncounter, fields);

      if (!isEmpty(prevValue?.value)) {
        if (question?.questionOptions.rendering === 'datetime') {
          const rawDate = new Date(prevValue.value);

          prevValue = {
            display: dayjs(prevValue.value).format('M/D/YYYY HH:mm'),
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
    getConceptNameAndUUID(question.questionOptions.concept).then(conceptTooltip => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName]);

  useEffect(() => {
    if (!time && field.value) {
      if (field.value instanceof Date) {
        const hours = field.value.getHours() < 10 ? `0${field.value.getHours()}` : `${field.value.getHours()}`;
        const minutes = field.value.getMinutes() < 10 ? `0${field.value.getMinutes()}` : `${field.value.getMinutes()}`;
        setTime([hours, minutes].join(':'));
      }
    }
  }, [field.value, time]);

  return encounterContext.sessionMode == 'view' || isTrue(question.readonly) ? (
    <OHRIFieldValueView
      label={question.label}
      value={field.value instanceof Date ? getDisplay(field.value, question.questionOptions.rendering) : field.value}
      conceptName={conceptName}
      isInline={isInline}
    />
  ) : (
    !question.isHidden && (
      <>
        <div className={`${styles.formField} ${styles.row} ${styles.datetime}`}>
          <div>
            <DatePicker
              datePickerType="single"
              onChange={onDateChange}
              // Investigate these styles
              className={`${styles.datePickerOverrides} ${isFieldRequiredError ? styles.errorLabel : ''} ${
                question.disabled || isTrue(question.readonly) ? styles.disabled : ''
              }`}
              dateFormat={carbonDateformat}>
              <DatePickerInput
                id={question.id}
                placeholder={placeholder}
                labelText={question.label}
                value={
                  field.value instanceof Date ? field.value.toLocaleDateString(window.navigator.language) : field.value
                }
                // Added for testing purposes.
                // Notes:
                // Something strange is happening with the way events are propagated and handled by Carbon.
                // When we manually trigger an onchange event using the 'fireEvent' lib, the handler below will
                // be triggered as opposed to the former handler that only gets triggered at runtime.
                onChange={e => onDateChange([dayjs(e.target.value, 'DD/MM/YYYY').toDate()])}
                disabled={question.disabled}
                invalid={!isFieldRequiredError && errors.length > 0}
                invalidText={errors[0]?.message}
                warn={warnings.length > 0}
                warnText={warnings[0]?.message}
              />
            </DatePicker>
          </div>
          {question?.questionOptions.rendering === 'datetime' ? (
            <TimePicker
              // This classname doesn't seem to exist
              className={styles.timePicker}
              id={question.id}
              labelText="Time:"
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
          ) : (
            ''
          )}
          {previousValueForReview && (
            <div className={`${styles.formField}`}>
              <PreviousValueReview
                value={previousValueForReview.value}
                displayText={previousValueForReview.display}
                setValue={onDateChange}
              />
            </div>
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
export default OHRIDate;
