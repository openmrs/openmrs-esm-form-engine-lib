import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { type InlineDateProps } from '../../../types';
import { FormContext } from '../../../form-context';
import { fieldRequiredErrCode } from '../../../validators/form-validator';
import { DatePicker } from '@carbon/react';
import { DatePickerInput } from '@carbon/react';
import { useField } from 'formik';

import styles from './inline-date.scss';

const locale = window.i18next?.language == 'en' ? 'en-GB' : window.i18next?.language;
const dateFormatter = new Intl.DateTimeFormat(locale);

const InlineDate: React.FC<InlineDateProps> = ({ question, setObsDateTime }) => {
  const { t } = useTranslation();
  const [field] = useField(`inline-date-${question.id}`);
  const { setFieldValue } = React.useContext(FormContext);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const isFieldRequiredError = useMemo(() => errors[0]?.errCode == fieldRequiredErrCode, [errors]);

  useEffect(() => {
    if (question?.meta?.submission) {
      question?.meta?.submission?.errors && setErrors(question?.meta?.submission?.errors);
      question?.meta?.submission?.warnings && setWarnings(question?.meta?.submission?.warnings);
    }
  }, [question.meta?.submission]);

  const onDateChange = ([date]) => {
    const refinedDate = date instanceof Date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000) : date;
    setFieldValue(`inline-date-${question.id}`, refinedDate);
    setObsDateTime(refinedDate);
    if (question.meta.submission) {
      question.meta.submission.newValue = Array.isArray(question.meta.submission.newValue)
        ? question.meta.submission.newValue.map((value) => ({ ...value, obsDatetime: refinedDate }))
        : { ...question.meta.submission.newValue, obsDatetime: refinedDate };
    }
  };

  const { placeholder, carbonDateformat } = useMemo(() => {
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
    const carbonDateformat = formatObj
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
    return { placeholder: placeholder, carbonDateformat: carbonDateformat };
  }, []);

  return (
    <div className={styles.datetime}>
      <div>
        <DatePicker
          datePickerType="single"
          onChange={onDateChange}
          className={isFieldRequiredError ? styles.errorLabel : styles.boldedLabel}
          dateFormat={carbonDateformat}>
          <DatePickerInput
            id={`inline-date-${question.id}`}
            aria-label="custom-inline-date-picker"
            placeholder={placeholder}
            labelText={<span>{t('dateInputLabel', 'Date of {{label}}', { label: question.label })}</span>}
            value={field.value instanceof Date ? field.value.toLocaleDateString(locale) : field.value}
            onChange={(e) => onDateChange([dayjs(e.target.value, placeholder.toUpperCase()).toDate()])}
            disabled={question.disabled || !question?.meta?.submission?.newValue}
            invalid={!isFieldRequiredError && errors.length > 0}
            invalidText={errors[0]?.message}
            warn={warnings.length > 0}
            warnText={warnings[0]?.message}
            readOnly={question.readonly}
          />
        </DatePicker>
      </div>
    </div>
  );
};

export default InlineDate;
