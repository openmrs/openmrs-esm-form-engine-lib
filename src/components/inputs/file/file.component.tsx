import React, { useEffect, useState, useMemo } from 'react';
import { FileUploader, Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OHRIFormFieldProps } from '../../../api/types';
import { useField } from 'formik';
import { isTrue } from '../../../utils/boolean-utils';
import { getConceptNameAndUUID, isInlineView } from '../../../utils/ohri-form-helper';
import { OHRIFormContext } from '../../../ohri-form-context';
import Camera from '../camera/camera.component';
import { Close } from '@carbon/react/icons';
import styles from './file.component.scss';
import { OHRIFieldValueView } from '../../value/view/ohri-field-value-view.component';

interface FileProps extends OHRIFormFieldProps {}
type AllowedModes = 'uploader' | 'camera' | '';

const File: React.FC<FileProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const [cameraWidgetVisible, setCameraWidgetVisible] = useState(false);
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext, layoutType, workspaceLayout } = React.useContext(OHRIFormContext);
  const [selectedFiles, setSelectedFiles] = useState(null); // Add state for selected files
  const [imagePreview, setImagePreview] = useState(null);
  const [conceptName, setConceptName] = useState('Loading...');
  const [uploadMode, setUploadMode] = useState<AllowedModes>('');

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
    setFieldValue(question.id, newSelectedFiles); // Update form field value
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
    </div>
  ) : (
    <div>
      <div className={styles.label}>{question.label}</div>
      <div className={styles.uploadSelector}>
        <div className={styles.selectorButton}>
          <Button onClick={() => setUploadMode('uploader')}>Upload image</Button>
        </div>
        <div className={styles.selectorButton}>
          <Button onClick={() => setUploadMode('camera')}>Camera capture</Button>
        </div>
      </div>
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
            onChange={handleFileChange} // Use handleFileChange to update selectedFiles
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
