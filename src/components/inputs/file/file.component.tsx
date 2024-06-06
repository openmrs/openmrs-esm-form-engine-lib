import React, { useEffect, useState, useMemo } from 'react';
import { FileUploader, Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { isTrue } from '../../../utils/boolean-utils';
import Camera from '../camera/camera.component';
import { Close, DocumentPdf } from '@carbon/react/icons';
import styles from './file.scss';
import { createAttachment } from '../../../utils/common-utils';
import { type FormFieldProps } from '../../../types';
import { FormContext } from '../../../form-context';
import { isInlineView } from '../../../utils/form-helper';
import { isEmpty } from '../../../validators/form-validator';

interface FileProps extends FormFieldProps {}
type AllowedModes = 'uploader' | 'camera' | 'edit' | '';

const File: React.FC<FileProps> = ({ question, handler }) => {
  const { t } = useTranslation();
  const [cameraWidgetVisible, setCameraWidgetVisible] = useState(false);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(FormContext);
  const [selectedFiles, setSelectedFiles] = useState(null); // Add state for selected files
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadMode, setUploadMode] = useState<AllowedModes>('');

  useEffect(() => {
    if (encounterContext.sessionMode === 'edit') {
      setUploadMode('edit');
    }
  }, []);

  const myInitVal = useMemo(() => {
    const initialValuesObject = encounterContext.initValues;
    const attachmentValue = Object.keys(initialValuesObject)
      .filter((key) => key === question.id)
      .reduce((cur, key) => {
        return Object.assign(cur, { [key]: initialValuesObject[key] });
      }, {});
    return attachmentValue;
  }, [encounterContext]);

  const attachmentValue = useMemo(() => {
    const firstValue = Object?.values(myInitVal)[0];
    if (!isEmpty(firstValue)) {
      const attachment = createAttachment(firstValue?.[0]);
      return attachment;
    }
  }, [myInitVal]);

  const isInline = useMemo(() => {
    if (['view', 'embedded-view'].includes(encounterContext.sessionMode) || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout, encounterContext.sessionMode);
    }
    return false;
  }, [encounterContext.sessionMode, question.readonly, question.inlineRendering, layoutType, workspaceLayout]);

  const labelDescription = question.questionOptions.allowedFileTypes
    ? t(
        'fileUploadDescription',
        `Upload one of the following file types: ${question.questionOptions.allowedFileTypes.map(
          (eachItem) => ` ${eachItem}`,
        )}`,
      )
    : t('fileUploadDescriptionAny', 'Upload any file type');

  const handleFileChange = (event) => {
    const [newSelectedFiles]: File[] = Array.from(event.target.files);
    setSelectedFiles(newSelectedFiles);
    setImagePreview(null);
    setFieldValue(question.id, newSelectedFiles);
    handler?.handleFieldSubmission(question, newSelectedFiles, encounterContext);
  };

  const setImages = (newImage) => {
    setSelectedFiles(newImage);
    setImagePreview(newImage);
    setCameraWidgetVisible(false);
    setFieldValue(question.id, newImage);
    handler?.handleFieldSubmission(question, newImage, encounterContext);
  };

  return encounterContext.sessionMode == 'view' || isTrue(question.readonly) ? (
    <div>
      <div className={styles.label}>{t(question.label)}</div>
      <div className={styles.uploadSelector}>
        <div className={styles.selectorButton}>
          <Button disabled={true} onClick={() => setUploadMode('uploader')}>
            {t('uploadImage', 'Upload image')}
          </Button>
        </div>
        <div className={styles.selectorButton}>
          <Button disabled={true} onClick={() => setUploadMode('camera')}>
            {t('cameraCapture', 'Camera capture')}
          </Button>
        </div>
      </div>
      <div className={styles.editModeImage}>
        <div className={styles.imageContent}>
          {attachmentValue.bytesContentFamily === 'PDF' ? (
            <div className={styles.pdfThumbnail} role="button" tabIndex={0}>
              <DocumentPdf size={24} />
            </div>
          ) : (
            <img src={attachmentValue.src} alt={t('preview', 'Preview')} width="200px" />
          )}
        </div>
      </div>
    </div>
  ) : (
    <div>
      <div className={styles.label}>{t(question.label)}</div>
      <div className={styles.uploadSelector}>
        <div className={styles.selectorButton}>
          <Button onClick={() => setUploadMode('uploader')}>Upload file</Button>
        </div>
        <div className={styles.selectorButton}>
          <Button onClick={() => setUploadMode('camera')}>Camera capture</Button>
        </div>
      </div>
      {uploadMode === 'edit' && attachmentValue && (
        <div className={styles.editModeImage}>
          <div className={styles.imageContent}>
            {attachmentValue.bytesContentFamily === 'PDF' ? (
              <div className={styles.pdfThumbnail} role="button" tabIndex={0}>
                <DocumentPdf size={24} />
              </div>
            ) : (
              <img src={attachmentValue.src} alt="Preview" width="200px" />
            )}
          </div>
        </div>
      )}
      {uploadMode === 'uploader' && (
        <div className={styles.fileUploader}>
          <FileUploader
            accept={question.questionOptions.allowedFileTypes ?? []}
            buttonKind="primary"
            buttonLabel={t('addFile', 'Add files')}
            filenameStatus="edit"
            iconDescription="Clear file"
            labelDescription={labelDescription}
            labelTitle={t('upload', 'Upload')}
            multiple={question.questionOptions.allowMultiple}
            onChange={handleFileChange}
          />
        </div>
      )}
      {uploadMode === 'camera' && (
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
              <Camera handleImages={setImages} />
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
