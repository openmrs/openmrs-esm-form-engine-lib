import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type FormFieldInputProps } from '../../../types';
import FieldLabel from '../../field-label/field-label.component';
import { showModal } from '@openmrs/esm-framework';
import styles from './predefined-annotation.scss';
import classNames from 'classnames';
import { AnnotationThumbnail } from './annotation-thumbnail.component';

const PredefinedAnnotation: React.FC<FormFieldInputProps> = ({ field, value, setFieldValue }) => {
  const { t } = useTranslation();

  const templates = field?.questionOptions?.annotationOptions?.templates || [];

  const showAnnotationModal = useCallback(
    (imageSrc: string) => {
      const close = showModal('annotation-editor-modal', {
        size: 'lg',
        src: imageSrc,
        title: t(field.label),
        onSave: () => {
          setFieldValue(null);
          close();
        },
        closeModal: () => {
          close();
        },
      });
    },
    [field.label, setFieldValue, t],
  );

  const handleResetAnnotation = () => {};

  const handleEditTemplate = (imageSrc: string) => {
    showAnnotationModal(imageSrc);
  };

  return (
    <div>
      <div className={classNames(styles.label, 'cds--label')}>
        <FieldLabel field={field} />
      </div>
      <div>
        <div className={styles.thumbnailContainer}>
          {templates.length > 0 ? (
            templates.map((template) => (
              <AnnotationThumbnail
                key={template.id}
                src={template.src}
                title={template.label}
                resetAnnotation={handleResetAnnotation}
                editTemplate={handleEditTemplate}
              />
            ))
          ) : (
            <div className={styles.noAnnotation}>
              {t('noAnnotationTemplates', 'No annotation templates available.')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredefinedAnnotation;
