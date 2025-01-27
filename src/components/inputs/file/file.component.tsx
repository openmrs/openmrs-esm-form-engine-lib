import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, Button } from '@carbon/react';
import { Add, CloseFilled } from '@carbon/react/icons';
import { DocumentPdf } from '@carbon/react/icons';
import styles from './file.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import FieldLabel from '../../field-label/field-label.component';
import {
  createAttachment,
  showModal,
  showSnackbar,
  type UploadedFile,
  useLayoutType,
} from '@openmrs/esm-framework';
import { useAllowedFileExtensions } from '@openmrs/esm-patient-common-lib';
import { FormGroup } from '@carbon/react';

const File: React.FC<FormFieldInputProps> = ({ field, value, errors, setFieldValue }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { layoutType, sessionMode, workspaceLayout } = useFormProviderContext();
  const {allowedFileExtensions} = useAllowedFileExtensions();

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  const showFileCaptureModal = useCallback(() => {
  const allowedExtensions = Array.isArray(allowedFileExtensions)
    ? allowedFileExtensions.filter((ext) => !/pdf/i.test(ext))
    : [];

  const close = showModal('capture-photo-modal', {
    saveFile: (file: UploadedFile) => {
      if (file) {
        // Transform the file to match the previous structure
        const transformedFile = {
          value: {
            ...file,
            bytesContentFamily: file.fileType?.includes('pdf') ? 'PDF' : 'IMAGE',
          }
        };

        setFieldValue((prevValue) => {
          const updatedValue = Array.isArray(prevValue) 
            ? [...prevValue, transformedFile.value]
            : [transformedFile.value];
          
          return updatedValue;
        });
      }
      close();
      return Promise.resolve();
    },
    closeModal: () => close(),
    allowedExtensions,
    collectDescription: true,
    multipleFiles: true,
  });
}, [allowedFileExtensions, setFieldValue]);
  

  const handleRemoveFile = (index: number) => {
    setFieldValue((prevValue) => {
      const updatedFiles = Array.isArray(prevValue) ? [...prevValue] : [];
      updatedFiles.splice(index, 1);
      return updatedFiles;
    });

    showSnackbar({
      title: t('fileRemoved', 'File removed'),
      kind: 'success',
      isLowContrast: true,
    });
  };

  if (['view', 'embedded-view'].includes(sessionMode)) {
    return (
      <FieldValueView
        label={t(field.label)}
        value={value}
        conceptName={field.meta?.concept?.display}
        isInline={isInline}
      />
    );
  }

  return (
    !field.isHidden && (
      <div className={styles.boldedLabel}>
        <Layer>
          <FormGroup
            legendText={<FieldLabel field={field} />}
            className={styles.boldedLegend}
            disabled={field.isDisabled}
            invalid={errors?.length > 0}
          >
          <div className={styles.fileInputContainer}>
            <p className={styles.helperText}>
              {t('imageUploadHelperText', "Upload images or files to add to your form.")}
            </p>
            <Button
              className={styles.uploadButton}
              kind={isTablet ? 'ghost' : 'tertiary'}
              onClick={showFileCaptureModal}
              renderIcon={(props) => <Add size={16} {...props} />}
              disabled={isTrue(field.readonly)}
            >
              {t('uploadFile', 'Upload file')}
            </Button>

            <div className={styles.fileThumbnailGrid}>
              {Array.isArray(value) && value.map((file, index) => (
                <div key={index} className={styles.fileThumbnailItem}>
                  <div className={styles.fileThumbnailContainer}>
                    {file.fileType?.includes('pdf') || file.bytesContentFamily === 'PDF' ? (
                      <div className={styles.pdfThumbnail}>
                        <DocumentPdf size={24} />
                      </div>
                    ) : (
                      <img
                        className={styles.fileThumbnail}
                        src={file.base64Content || file.src}
                        alt={file.fileDescription ?? file.fileName}
                      />
                    )}
                  </div>
                  <Button 
                    kind="ghost" 
                    className={styles.removeButton} 
                    onClick={() => handleRemoveFile(index)}
                    aria-label={t('removeFile', 'Remove file')}
                  >
                    <CloseFilled size={16} className={styles.closeIcon} />
                  </Button>
                </div>
              ))}
            </div>
            
            {errors.length > 0 && (
              <div className={styles.errorMessage}>
                {errors[0]?.message}
              </div>
            )}
          </div>
          </FormGroup>
        </Layer>
      </div>
    )
  );
};

export default File;