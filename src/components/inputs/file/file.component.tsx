import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, FileUploader, Button } from '@carbon/react';
import { DocumentPdf, Camera, Close } from '@carbon/react/icons';
import styles from './file.scss';
import { useFormProviderContext } from '../../../provider/form-provider';
import { type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import { shouldUseInlineLayout } from '../../../utils/form-helper';
import FieldValueView from '../../value/view/field-value-view.component';
import FieldLabel from '../../field-label/field-label.component';
import CameraComponent from './camera/camera.component';

type DataSourceType = 'filePicker' | 'camera' | null;

const File: React.FC<FormFieldInputProps> = ({ field, value, errors, setFieldValue }) => {
  const { t } = useTranslation();
  const [dataSource, setDataSource] = useState<DataSourceType>(null);
  const [cameraWidgetVisible, setCameraWidgetVisible] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const { layoutType, sessionMode, workspaceLayout } = useFormProviderContext();

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(sessionMode) || isTrue(field.readonly)) {
      return shouldUseInlineLayout(field.inlineRendering, layoutType, workspaceLayout, sessionMode);
    }
    return false;
  }, [sessionMode, field.readonly, field.inlineRendering, layoutType, workspaceLayout]);

  const labelDescription = useMemo(() => {
    return field.questionOptions.allowedFileTypes
      ? t(
          'fileUploadDescription',
          `Upload one of the following file types: ${field.questionOptions.allowedFileTypes.join(', ')}`
        )
      : t('fileUploadDescriptionAny', 'Upload any file type');
  }, [field.questionOptions.allowedFileTypes, t]);

  const handleFilePickerChange = useCallback(
    (event) => {
      const selectedFiles: File[] = Array.from(event.target.files);
    setImagePreview(null); 
    setFieldValue((prevValue) => [...(prevValue || []), ...selectedFiles]);
    },
    [setFieldValue]
  );

  const handleCameraImageChange = useCallback(
    (newImage) => {
      setImagePreview(newImage);
      setCameraWidgetVisible(false);
      setFieldValue(newImage);
    },
    [setFieldValue]
  );

  const renderFilePreview = () => (
    <div className={styles.editModeImage}>
      <div className={styles.imageContent}>
      {Array.isArray(value) ? (
        value.map((file, index) => (
          <div key={index} className={styles.fileThumbnail}>
            {file.bytesContentFamily === 'PDF' ? (
              <div className={styles.pdfThumbnail} role="button" tabIndex={0}>
                <DocumentPdf size={24} />
              </div>
            ) : (
              <img src={file.src} alt={t('preview', 'Preview')} width="200px" />
            )}
          </div>
        ))
      ) : (
        <>
          {value?.bytesContentFamily === 'PDF' ? (
            <div className={styles.pdfThumbnail} role="button" tabIndex={0}>
              <DocumentPdf size={24} />
            </div>
          ) : (
            <img src={value?.src} alt={t('preview', 'Preview')} width="200px" />
          )}
        </>
      )}
    </div>
  </div>
);

  if (sessionMode === 'view' || sessionMode === 'embedded-view') {
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
         <div className={styles.fileInputContainer}>
            <FieldLabel field={field} />
            <div className={styles.uploadSelector}>
              <Button
                disabled={isTrue(field.readonly)}
                onClick={() => setDataSource('filePicker')}
                kind="secondary"
                size="md"
                className={`${styles.uploadFileButton}`} 
                >
                {t('uploadFile', 'Upload file')}
              </Button>
              <Button
                disabled={isTrue(field.readonly)}
                onClick={() => setDataSource('camera')}
                kind="secondary"
                size="md"
                renderIcon={Camera}
                className={`${styles.cameraCaptureButton}`} 
              >
                {t('cameraCapture', 'Camera capture')}
              </Button>
            </div>

            {!dataSource && value && renderFilePreview()}

            {dataSource === 'filePicker' && (
              <div className={styles.fileUploader}>
                <FileUploader
                  accept={field.questionOptions.allowedFileTypes ?? []}
                  multiple={field.questionOptions.allowMultiple ?? true}
                  buttonKind="primary"
                  buttonLabel={t('addFile', 'Add file')}
                  filenameStatus="edit"
                  iconDescription={t('clearFile', 'Clear file')}
                  labelDescription={labelDescription}
                  labelTitle={t('upload', 'Upload')}
                  onChange={handleFilePickerChange}
                  invalid={errors.length > 0}
                  invalidText={errors[0]?.message}
                />
              </div>
            )}

            {dataSource === 'camera' && (
              <div className={styles.cameraUploader}>
                 <p className={styles.titleStyles}>Camera</p>
                 <p className={styles.descriptionStyles}>Capture image via camera</p>
                <Button
                  onClick={() => setCameraWidgetVisible((prev) => !prev)}
                  size="md"
                  className={styles.cameraToggle}
                >
                  {cameraWidgetVisible ? t('closeCamera', 'Close camera') : t('openCamera', 'Open camera')}
                </Button>

                {cameraWidgetVisible && (
                  <div className={styles.cameraPreview}>
                    <CameraComponent handleImages={handleCameraImageChange} />
                  </div>
                )}

                {imagePreview && (
                  <div className={styles.capturedImage}>
                    <div className={styles.imageContent}>
                      <img src={imagePreview} alt={t('preview', 'Preview')} width="200px" />
                      <Button
                        hasIconOnly
                        renderIcon={Close}
                        iconDescription={t('clearImage', 'Clear image')}
                        onClick={() => setImagePreview(null)}
                        size="sm"
                        kind="ghost"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
         </Layer>
      </div>
    )
  );
};

export default File;