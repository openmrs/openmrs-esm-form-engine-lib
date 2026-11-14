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
    value
      ?.filter((attachment) => !attachment.voided)
      .forEach((attachment) => attachmentMap.set(attachment.templateId, attachment));
    return attachmentMap;
  }, [value]);

  const handleEditTemplate = useCallback(
    (template: AnnotationTemplate) => {
      const currentAnnotatedAttachment = annotatedAttachmentsMap.get(template.id);

      launchWorkspace2('annotation-editor-workspace', {
        templateSrc: template.src,
        annotatedTemplateSrc: currentAnnotatedAttachment?.base64Content,
        title: template.label,
        annotationComments: currentAnnotatedAttachment?.fileDescription ?? null,
        onSave: (annotatedAttachment: Omit<AnnotatedAttachment, 'templateId'>) => {
          const currentAnnotatedAttachments = value ? [...value] : [];
          const existingAnnotatedAttachmentIndex = currentAnnotatedAttachments.findIndex(
            (a) => a.templateId === template.id && !a.voided,
          );
          const newAnnotatedAttachment: AnnotatedAttachment = { ...annotatedAttachment, templateId: template.id };

          if (existingAnnotatedAttachmentIndex === -1) {
            currentAnnotatedAttachments.push(newAnnotatedAttachment);
          } else if (currentAnnotatedAttachments[existingAnnotatedAttachmentIndex].uuid) {
            currentAnnotatedAttachments[existingAnnotatedAttachmentIndex] = {
              ...currentAnnotatedAttachments[existingAnnotatedAttachmentIndex],
              voided: true,
            };
            currentAnnotatedAttachments.push(newAnnotatedAttachment);
          } else {
            currentAnnotatedAttachments[existingAnnotatedAttachmentIndex] = newAnnotatedAttachment;
          }

          setFieldValue(currentAnnotatedAttachments);
        },
      });
    },
    [value, setFieldValue, annotatedAttachmentsMap],
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
