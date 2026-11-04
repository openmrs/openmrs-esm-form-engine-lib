import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { type AnnotatedAttachment, type FormFieldInputProps } from '../../../types';
import { type AnnotationTemplate } from '../../../types/schema';
import FieldLabel from '../../field-label/field-label.component';
import { AnnotationThumbnail } from './annotation-thumbnail.component';
import styles from './predefined-annotation.scss';
import classNames from 'classnames';

const PredefinedAnnotation: React.FC<FormFieldInputProps<Array<AnnotatedAttachment>>> = ({
  field,
  value,
  setFieldValue,
}) => {
  const { t } = useTranslation();

  const annotatedAttachmentsMap = useMemo(() => {
    const attachmentMap = new Map<string, AnnotatedAttachment>();
    if (value) value.forEach((attachment) => attachmentMap.set(attachment.templateId, attachment));
    return attachmentMap;
  }, [value]);

  const handleEditTemplate = useCallback(
    (template: AnnotationTemplate) => {
      const annotatedTemplate = annotatedAttachmentsMap.get(template.id)?.base64Content ?? undefined;

      launchWorkspace2('annotation-editor-workspace', {
        templateSrc: template.src,
        annotatedTemplateSrc: annotatedTemplate,
        title: template.label,
        onSave: (annotatedAttachment: Omit<AnnotatedAttachment, 'templateId'>) => {
          const currentAnnotations = value ? [...value] : [];
          const existingIndex = currentAnnotations.findIndex((a) => a.templateId === template.id);

          const newAnnotatedAttachment: AnnotatedAttachment = { ...annotatedAttachment, templateId: template.id };

          if (existingIndex >= 0) currentAnnotations[existingIndex] = newAnnotatedAttachment;
          else currentAnnotations.push(newAnnotatedAttachment);

          setFieldValue(currentAnnotations);
        },
      });
    },
    [value, setFieldValue],
  );

  const templates = field?.questionOptions?.annotationOptions?.templates ?? [];

  return (
    <div>
      <div className={classNames(styles.label, 'cds--label')}>
        <FieldLabel field={field} />
      </div>
      <div className={styles.thumbnailContainer}>
        {templates.length > 0 ? (
          templates.map((template) => {
            const annotatatedAttachment = annotatedAttachmentsMap.get(template.id);
            return (
              <AnnotationThumbnail
                key={template.id}
                src={annotatatedAttachment ? annotatatedAttachment.base64Content : template.src}
                title={template.label}
                isAnnotated={!!annotatatedAttachment}
                onEdit={() => handleEditTemplate(template)}
              />
            );
          })
        ) : (
          <div className={styles.noAnnotations}>{t('noAnnotationTemplates', 'No annotation templates available.')}</div>
        )}
      </div>
    </div>
  );
};

export default PredefinedAnnotation;
