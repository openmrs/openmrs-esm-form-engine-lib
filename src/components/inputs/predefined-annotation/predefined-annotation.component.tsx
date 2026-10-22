import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { type Attachment, type FormFieldInputProps } from '../../../types';
import { type AnnotationTemplate } from '../../../types/schema';
import FieldLabel from '../../field-label/field-label.component';
import { AnnotationThumbnail } from './annotation-thumbnail.component';
import styles from './predefined-annotation.scss';
import classNames from 'classnames';

interface AnnotatedImage {
  base64Content: string;
  fileName: string;
  fileType: string;
  fileDescription: string;
  status?: 'uploading' | 'complete';
}

const PredefinedAnnotation: React.FC<FormFieldInputProps<Array<Attachment>>> = ({ field, value, setFieldValue }) => {
  const { t } = useTranslation();

  const templates = field?.questionOptions?.annotationOptions?.templates ?? [];

  const annotationMap = useMemo(() => {
    const map = new Map<string, Attachment>();
    if (value) {
      value.forEach((attachment) => {
        if (attachment.uuid) {
          map.set(attachment.uuid, attachment);
        }
      });
    }
    return map;
  }, [value]);

  const handleEditTemplate = useCallback(
    (template: AnnotationTemplate) => {
      const annotatedTemplate = annotationMap.get(template.id)?.base64Content ?? undefined;

      launchWorkspace2('annotation-editor-workspace', {
        src: template.src,
        annotatedSrc: annotatedTemplate,
        title: template.label,
        onSave: (annotatedImage: AnnotatedImage) => {
          const newAttachment: Attachment = {
            uuid: template.id,
            base64Content: annotatedImage.base64Content,
            fileName: annotatedImage.fileName,
            fileType: annotatedImage.fileType,
            fileDescription: annotatedImage.fileDescription,
            status: annotatedImage.status,
          };

          const currentAnnotations = value ? [...value] : [];
          const existingIndex = currentAnnotations.findIndex((a) => a.uuid === template.id);

          if (existingIndex >= 0) {
            currentAnnotations[existingIndex] = newAttachment;
          } else {
            currentAnnotations.push(newAttachment);
          }

          setFieldValue(currentAnnotations);
        },
      });
    },
    [value, setFieldValue],
  );

  return (
    <div>
      <div className={classNames(styles.label, 'cds--label')}>
        <FieldLabel field={field} />
      </div>
      <div className={styles.thumbnailContainer}>
        {templates.length > 0 ? (
          templates.map((template) => {
            const annotation = annotationMap.get(template.id);
            return (
              <AnnotationThumbnail
                key={template.id}
                src={annotation ? annotation.base64Content : template.src}
                title={template.label}
                isAnnotated={!!annotation}
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
