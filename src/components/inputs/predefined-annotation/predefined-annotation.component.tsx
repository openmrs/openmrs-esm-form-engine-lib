import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2, showSnackbar } from '@openmrs/esm-framework';
import { type AnnotatedAttachment, type FormFieldInputProps } from '../../../types';
import { type AnnotationTemplate } from '../../../types/schema';
import { useFormProviderContext } from '../../../provider/form-provider';
import { isTrue } from '../../../utils/boolean-utils';
import { isViewMode } from '../../../utils/common-utils';
import FieldLabel from '../../field-label/field-label.component';
import { AnnotationThumbnail } from './annotation-thumbnail.component';
import styles from './predefined-annotation.scss';
import classNames from 'classnames';

const PredefinedAnnotation: React.FC<FormFieldInputProps<Array<AnnotatedAttachment>>> = ({
  field,
  value,
  errors,
  warnings,
  setFieldValue,
}) => {
  const { t } = useTranslation();
  const { sessionMode } = useFormProviderContext();

  const annotatedAttachmentsMap = useMemo(() => {
    const attachmentMap = new Map<string, AnnotatedAttachment>();
    value
      ?.filter((attachment) => !attachment.voided)
      .forEach((attachment) => attachmentMap.set(attachment.templateId, attachment));
    return attachmentMap;
  }, [value]);

  const handleEditTemplate = useCallback(
    async (template: AnnotationTemplate) => {
      const currentAnnotatedAttachment = annotatedAttachmentsMap.get(template.id);

      try {
        await launchWorkspace2('annotation-editor-workspace', {
          templateSrc: template.src,
          annotatedTemplateSrc: currentAnnotatedAttachment?.base64Content,
          title: t(template.label),
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
      } catch (error) {
        showSnackbar({
          title: t('errorLaunchingWorkspace', 'Error launching workspace'),
          subtitle:
            (error as Error)?.message ??
            t('errorLaunchingWorkspaceSubtitle', 'An unexpected error occurred while launching the workspace.'),
          kind: 'error',
          isLowContrast: true,
        });
      }
    },
    [value, setFieldValue, annotatedAttachmentsMap, t],
  );

  if (field.isHidden) {
    return null;
  }

  const templates = field.questionOptions?.annotationOptions?.templates ?? [];
  const isEditable = !isViewMode(sessionMode) && !isTrue(field.readonly) && !field.isDisabled;
  const errorMessage = errors?.[0]?.message;
  const warningMessage = warnings?.[0]?.message;

  return (
    <div>
      <div className={classNames(styles.label, 'cds--label')}>
        <FieldLabel field={field} />
      </div>
      <div className={styles.thumbnailContainer}>
        {templates.length > 0 ? (
          templates.map((template) => {
            const annotatedAttachment = annotatedAttachmentsMap.get(template.id);
            return (
              <AnnotationThumbnail
                key={template.id}
                src={annotatedAttachment ? annotatedAttachment.base64Content : template.src}
                title={t(template.label)}
                isAnnotated={!!annotatedAttachment}
                isEditable={isEditable}
                onEdit={() => handleEditTemplate(template)}
              />
            );
          })
        ) : (
          <div className={styles.noAnnotations}>{t('noAnnotationTemplates', 'No annotation templates available.')}</div>
        )}
      </div>
      {errorMessage ? (
        <div className={styles.errorMessage} role="alert">
          {errorMessage}
        </div>
      ) : warningMessage ? (
        <div className={styles.warningMessage}>{warningMessage}</div>
      ) : null}
    </div>
  );
};

export default PredefinedAnnotation;
