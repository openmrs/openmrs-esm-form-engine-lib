import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type FormSection } from '../../../types';
import { useFormProviderContext } from '../../../provider/form-provider';
import { FormFieldRenderer } from '../form-field-renderer.component';
import styles from './section-renderer.scss';
import classNames from 'classnames';
import { hasRendering } from '../../../utils/common-utils';
import Tooltip from '../../inputs/tooltip/tooltip.component';

// TODOs:
// - Handle unspecified fields
// - Handle historical values (previous values)

export const SectionRenderer = ({ section }: { section: FormSection }) => {
  const { t } = useTranslation();
  const { formFieldAdapters } = useFormProviderContext();
  const sectionId = useMemo(() => section.label.replace(/\s/g, ''), [section.label]);
  return (
    <div className={styles.section}>
      {section.questions.map((question) =>
        formFieldAdapters[question.type] ? (
          <div key={`${sectionId}-${question.id}`} className={styles.sectionBody}>
            <div
              className={classNames({
                [styles.questionInfoDefault]: question.questionInfo && hasRendering(question, 'radio'),
                [styles.questionInfoCentralized]: question.questionInfo && !hasRendering(question, 'radio'),
              })}>
              <div
                className={classNames({
                  [styles.flexFullWidth]: [
                    'ui-select-extended',
                    'content-switcher',
                    'select',
                    'textarea',
                    'text',
                    'checkbox',
                  ].includes(question.questionOptions.rendering),
                })}>
                <FormFieldRenderer field={question} valueAdapter={formFieldAdapters[question.type]} />
              </div>
              {/** TODO: move tooltip to the form-field renderer; see: https://github.com/openmrs/openmrs-form-engine-lib/pull/351 */}
              {question.questionInfo && (
                <div className={styles.questionInfoContainer}>
                  <Tooltip field={question} />
                </div>
              )}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
};
