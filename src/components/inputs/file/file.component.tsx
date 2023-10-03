import React, { useEffect, useState, useCallback } from 'react';
import { FileUploader, Button, ModalHeader, ModalBody } from '@carbon/react';
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
  const [selectedFiles, setSelectedFiles] = useState(null); // Add state for selected files
  const [obsResponse, setObseResponse] = useState(null);

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
    return [blob, mimeString];
  }

  const labelDescription = question.questionOptions.allowedFileTypes
    ? t('fileUploadDescription', `Upload one of the following file types: ${question.questionOptions.allowedFileTypes}`)
    : t('fileUploadDescriptionAny', 'Upload any file type');

  const handleFileChange = event => {
    const [newSelectedFiles] = Array.from(event.target.files);
    console.log(newSelectedFiles);
    setSelectedFiles(newSelectedFiles);
    setFieldValue(question.id, newSelectedFiles); // Update form field value
    question.value = handler?.handleFieldSubmission(question, newSelectedFiles, encounterContext);
  };

  const setImages = newImage => {
    setSelectedFiles(newImage);
    setCameraWidgetVisible(false);
    setFieldValue(question.id, newImage);
    question.value = handler?.handleFieldSubmission(question, newImage, encounterContext);
    console.log(question.value);
  };

  function savePatientPhoto(patientUuid: string, content: string, url: string, date: string, conceptUuid: string) {
    const abortController = new AbortController();

    const [blobData, mimeString] = dataURItoFile(content);

    if (typeof mimeString === 'string') {
      const fileExtension = mimeString.split('/')[1];
    }

    const formData = new FormData();

    formData.append('patient', patientUuid);
    formData.append('file', blobData, 'OHRIFileConceptTest.png');
    formData.append(
      'json',
      JSON.stringify({
        person: patientUuid,
        concept: conceptUuid,
        groupMembers: [],
        obsDatetime: date,
        //encounter: encounterUUID
      }),
    );

    openmrsFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data', //for submission to attachments endpoint
      },
      signal: abortController.signal,
      body: formData,
    })
      .then(response => response.json())
      .then(resData => {
        setObseResponse(resData);
        console.log(resData);
      })
      .catch(err => console.log(err.message));

    setCamImage(null);
  }

  const handleClick = useCallback(() => {
    savePatientPhoto(
      'b280078a-c0ce-443b-9997-3c66c63ec2f8',
      camImage,
      '/ws/rest/v1/obs',
      new Date().toISOString(),
      'dd7bddf7-3bc5-4417-ab7c-3954e58bd63a',
    );
  }, [camImage]);

  useEffect(() => {
    console.log(selectedFiles);
  }, []);

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

      <div className={styles.camButton}>
        <Button onClick={() => setCameraWidgetVisible(prevState => !prevState)}>Capture image</Button>
        {cameraWidgetVisible && <CameraCapture handleImages={setImages} />}
      </div>

      <div className={styles.Image}>
        {selectedFiles && (
          <>
            <div className={styles.capturedImage}>
              <ModalHeader title="Captured image" />
              <div>
                <ModalBody>
                  <img src={camImage} alt="Preview" width="200px" />
                </ModalBody>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default File;
