import React, { useState, useMemo, useCallback } from 'react';
import { FileUploader, Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { isTrue } from '../../../utils/boolean-utils';
import Camera from './camera/camera.component';
import { Close, DocumentPdf } from '@carbon/react/icons';
import styles from './file.scss';
import { type FormFieldInputProps } from '../../../types';
import { useFormProviderContext } from '../../../provider/form-provider';
import { isViewMode } from '../../../utils/common-utils';
import FieldValueView from '../../value/view/field-value-view.component';
import FieldLabel from '../../field-label/field-label.component';

type DataSourceType = 'filePicker' | 'camera' | null;

const File: React.FC<FormFieldInputProps> = ({ field, value, setFieldValue }) => {
  const { t } = useTranslation();
  const [cameraWidgetVisible, setCameraWidgetVisible] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [dataSource, setDataSource] = useState<DataSourceType>(null);
  const { sessionMode } = useFormProviderContext();

  const labelDescription = useMemo(() => {
    return field.questionOptions.allowedFileTypes
      ? t(
          'fileUploadDescription',
          `Upload one of the following file types: ${field.questionOptions.allowedFileTypes.map(
            (eachItem) => ` ${eachItem}`,
          )}`,
        )
      : t('fileUploadDescriptionAny', 'Upload any file type');
  }, [field.questionOptions.allowedFileTypes, t]);

  const handleFilePickerChange = useCallback(
    (event) => {
      // TODO: Add multiple file upload support; see: https://openmrs.atlassian.net/browse/O3-3682
      const [selectedFile]: File[] = Array.from(event.target.files);
      setImagePreview(null);
      setFieldValue(selectedFile);
    },
    [setFieldValue],
  );

  const handleCameraImageChange = useCallback(
    (newImage) => {
      setImagePreview(newImage);
      setCameraWidgetVisible(false);
      setFieldValue(newImage);
    },
    [setFieldValue],
  );

  if (isViewMode(sessionMode) && !value) {
    return (
      <FieldValueView label={t(field.label)} value={null} conceptName={field.meta.concept?.display} isInline={false} />
    );
  }

  return isViewMode(sessionMode) ? (
    <div>
      <div className={styles.label}>{t(field.label)}</div>
      <div className={styles.editModeImage}>
        <div className={styles.imageContent}>
          {value.bytesContentFamily === 'PDF' ? (
            <div className={styles.pdfThumbnail} role="button" tabIndex={0}>
              <DocumentPdf size={24} />
            </div>
          ) : (
            <img src={value.src} alt={t('preview', 'Preview')} width="200px" />
          )}
        </div>
      </div>
    </div>
  ) : (
    <div>
      <div className={styles.label}>
        <FieldLabel field={field} />
      </div>
      <div className={styles.uploadSelector}>
        <div className={styles.selectorButton}>
          <Button disabled={isTrue(field.readonly)} onClick={() => setDataSource('filePicker')}>
            {t('uploadImage', 'Upload image')}
          </Button>
        </div>
        <div className={styles.selectorButton}>
          <Button disabled={isTrue(field.readonly)} onClick={() => setDataSource('camera')}>
            {t('cameraCapture', 'Camera capture')}
          </Button>
        </div>
      </div>
      {!dataSource && value && (
        <div className={styles.editModeImage}>
          <div className={styles.imageContent}>
            {value.bytesContentFamily === 'PDF' ? (
              <div className={styles.pdfThumbnail} role="button" tabIndex={0}>
                <DocumentPdf size={24} />
              </div>
            ) : (
              <img src={value.src} alt="Preview" width="200px" />
            )}
          </div>
        </div>
      )}
      {dataSource === 'filePicker' && (
        <div className={styles.fileUploader}>
          <FileUploader
            accept={field.questionOptions.allowedFileTypes ?? []}
            buttonKind="primary"
            buttonLabel={t('addFile', 'Add files')}
            filenameStatus="edit"
            iconDescription={t('clearFile', 'Clear file')}
            labelDescription={labelDescription}
            labelTitle={t('upload', 'Upload')}
            // TODO: Add multiple file upload support; see: https://openmrs.atlassian.net/browse/O3-3682
            // multiple={field.questionOptions.allowMultiple}
            onChange={handleFilePickerChange}
          />
        </div>
      )}
      {dataSource === 'camera' && (
        <div className={styles.cameraUploader}>
          <div className={styles.camButton}>
            <p className={styles.titleStyles}>Camera</p>
            <p className={styles.descriptionStyles}>Capture image via camera</p>
            <Button onClick={() => setCameraWidgetVisible((prevState) => !prevState)} size="md">
              {cameraWidgetVisible ? t('closeCamera', 'Close camera') : t('addCameraImage', 'Add camera image')}
            </Button>
          </div>
          {cameraWidgetVisible && (
            <div className={styles.cameraPreview}>
              <Camera handleImages={handleCameraImageChange} />
            </div>
          )}
          {imagePreview && (
            <div className={styles.capturedImage}>
              <div className={styles.imageContent}>
                <img src={imagePreview} alt={t('preview', 'Preview')} width="200px" />
                <div className={styles.caption}>
                  <p>{t('uploadedPhoto', 'Uploaded photo')}</p>
                  <div
                    tabIndex={0}
                    role="button"
                    onClick={() => {
                      setImagePreview(null);
                    }}
                    className={styles.closeIcon}>
                    <Close />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default File;
