import React, { useEffect, useState, useMemo } from 'react';
import { FileUploader, Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OHRIFormFieldProps } from '../../../api/types';
import { useField } from 'formik';
import { isTrue } from '../../../utils/boolean-utils';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { OHRIFormContext } from '../../../ohri-form-context';
import Camera from '../camera/camera.component';
import { Close, DocumentPdf } from '@carbon/react/icons';
import styles from './file.component.scss';
import { createGalleryEntry } from '../../../utils/common-utils';

interface FileProps extends OHRIFormFieldProps {}
type AllowedModes = 'uploader' | 'camera' | 'edit' | '';

const File: React.FC<FileProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const [cameraWidgetVisible, setCameraWidgetVisible] = useState(false);
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(OHRIFormContext);
  const [selectedFiles, setSelectedFiles] = useState(null); // Add state for selected files
  const [imagePreview, setImagePreview] = useState(null);
  const [conceptName, setConceptName] = useState('Loading...');
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
    if (firstValue) {
      const attachment = createGalleryEntry(firstValue?.[0]);
      return attachment;
    }
  }, [myInitVal]);

  const isInline = useMemo(() => {
    if (encounterContext.sessionMode == 'view' || isTrue(question.readonly)) {
      return isInlineView(question.inlineRendering, layoutType, workspaceLayout);
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
    question.value = handler?.handleFieldSubmission(question, newSelectedFiles, encounterContext);
  };

  const setImages = (newImage) => {
    setSelectedFiles(newImage);
    setImagePreview(newImage);
    setCameraWidgetVisible(false);
    setFieldValue(question.id, newImage);
    question.value = handler?.handleFieldSubmission(question, newImage, encounterContext);
  };

  useEffect(() => {
    getConceptNameAndUUID(question.questionOptions.concept).then((conceptTooltip) => {
      setConceptName(conceptTooltip);
    });
  }, [conceptName]);

  return encounterContext.sessionMode == 'view' || isTrue(question.readonly) ? (
    <div>
      <div className={styles.label}>{question.label}</div>
      <div className={styles.uploadSelector}>
        <div className={styles.selectorButton}>
          <Button disabled={true} onClick={() => setUploadMode('uploader')}>
            Upload image
          </Button>
        </div>
        <div className={styles.selectorButton}>
          <Button disabled={true} onClick={() => setUploadMode('camera')}>
            Camera capture
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
            <img src={attachmentValue.src} alt="Preview" width="200px" />
          )}
        </div>
      </div>
    </div>
  ) : (
    <div>
      <div className={styles.label}>{question.label}</div>
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
            labelTitle={t('fileUploadTitle', 'Upload')}
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
              {cameraWidgetVisible ? 'Close camera' : 'Add camera image'}
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
                <img src={imagePreview} alt="Preview" width="200px" />
                <div className={styles.Caption}>
                  <p>{'Camera uploaded photo'}</p>
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
