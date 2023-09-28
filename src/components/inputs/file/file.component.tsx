import React, { useEffect, useState, useCallback } from 'react';
import { FileUploader, Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OHRIFormFieldProps } from '../../../api/types';
import { useField } from 'formik';
import { OHRIFormContext } from '../../../ohri-form-context';
import CameraCapture from '../camera/camera.component';
import { openmrsFetch } from '@openmrs/esm-framework';
import styles from './file.component.scss';

interface FileProps extends OHRIFormFieldProps {}

const File: React.FC<FileProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const [cameraWidgetVisible, setCameraWidgetVisible] = useState(false);
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext } = React.useContext(OHRIFormContext);
  const [camImage, setCamImage] = useState<string>(null);
  const [selectedFiles, setSelectedFiles] = useState([]); // Add state for selected files

  function dataURItoFile(dataURI: string) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI
      .split(',')[0]
      .split(':')[1]
      .split(';')[0];

    // write the bytes of the string to a typed array
    const buffer = new Uint8Array(byteString.length);

    for (let i = 0; i < byteString.length; i++) {
      buffer[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([buffer], { type: mimeString });
    return blob;
  }

  const labelDescription = question.questionOptions.allowedFileTypes
    ? t('fileUploadDescription', `Upload one of the following file types: ${question.questionOptions.allowedFileTypes}`)
    : t('fileUploadDescriptionAny', 'Upload any file type');

  const handleFileChange = event => {
    const newSelectedFiles = Array.from(event.target.files);
    setSelectedFiles(newSelectedFiles);
    setFieldValue(question.id, newSelectedFiles); // Update form field value
    question.value = handler?.handleFieldSubmission(question, newSelectedFiles, encounterContext);
  };

  const setImages = newImage => {
    setCamImage(newImage);
    setCameraWidgetVisible(false);

    const fileData = dataURItoFile(newImage);
    //   new FormData();
    // fileData.append('patient', 'b280078a-c0ce-443b-9997-3c66c63ec2f8');
    // fileData.append('file', dataURItoFile(newImage), 'test-image.png');
    // fileData.append(
    //   'json',
    //   JSON.stringify({
    //     person: 'b280078a-c0ce-443b-9997-3c66c63ec2f8',
    //     concept: '1f3a89ef-e3b1-4171-be3a-4d4c1cd4e8c4',
    //     groupMembers: [],
    //     obsDatetime: new Date().toISOString(),
    //   }),
    // );

    setFieldValue(question.id, fileData);
    question.value = handler?.handleFieldSubmission(question, fileData, encounterContext);
  };

  return (
    <div>
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

      <div className={styles.Image}>
        <div>
          <Button onClick={() => setCameraWidgetVisible(prevState => !prevState)}>Capture image</Button>
          {cameraWidgetVisible && <CameraCapture handleImages={setImages} />}
        </div>

        {camImage && (
          <div className={styles.capturedImage}>
            <img src={camImage} alt="Preview" width="200px" />
          </div>
        )}

        {/* Display previews of selected files */}
        {selectedFiles.length > 0 && (
          <div className="file-previews">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-preview">
                <p>{file.name}</p>
                {file.type.includes('image') ? (
                  <img src={URL.createObjectURL(file)} alt="Preview" width="40px" />
                ) : (
                  <span>File Icon</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default File;
