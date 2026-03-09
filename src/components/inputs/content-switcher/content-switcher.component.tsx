import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { FormGroup, ContentSwitcher as CdsContentSwitcher, Switch } from '@carbon/react';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import { isTrue } from '../../../utils/boolean-utils';
import { type FormFieldInputProps } from '../../../types';
import FieldValueView from '../../value/view/field-value-view.component';
import styles from './content-switcher.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import FieldLabel from '../../field-label/field-label.component';

const ContentSwitcher: React.FC<FormFieldInputProps> = ({ field, value, errors, warnings, setFieldValue }) => {
  const { t } = useTranslation();
  const { layoutType, sessionMode, workspaceLayout, formFieldAdapters } = useFormProviderContext();

  const handleChange = useCallback(
    (value) => {
      setFieldValue(value.name);
    },
    [setFieldValue],
  );

  const visibleAnswers = useMemo(
    () => field.questionOptions.answers.filter((answer) => !answer.isHidden),
    [field.questionOptions.answers],
  );

  const selectedIndex = useMemo(
    () => visibleAnswers.findIndex((option) => option.concept == value),
    [value, visibleAnswers],
  );

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  return sessionMode == 'view' || sessionMode == 'embedded-view' || isTrue(field.readonly) ? (
    <div className={styles.formField}>
      <FieldValueView
        label={t(field.label)}
        value={value ? formFieldAdapters[field.type].getDisplayValue(field, value) : value}
        conceptName={field.meta?.concept?.display}
        isInline={isInline}
      />
    </div>
  ) : (
    !field.isHidden && (
      <FormGroup
        legendText={
          <div className={styles.boldedLegend}>
            <FieldLabel field={field} />
          </div>
        }
        className={classNames({
          [styles.errorLegend]: errors.length > 0,
          [styles.boldedLegend]: errors.length === 0,
        })}>
        <CdsContentSwitcher
          onChange={handleChange}
          selectedIndex={selectedIndex}
          className={styles.selectedOption}
          size="md">
          {visibleAnswers.map((option, index) => (
            <Switch
              name={option.concept || option.value}
              text={t(option.label)}
              key={index}
              disabled={field.isDisabled}
            />
          ))}
        </CdsContentSwitcher>
      </FormGroup>
    )
  );
};

export default ContentSwitcher;
