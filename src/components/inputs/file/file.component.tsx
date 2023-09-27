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

  const patientuuid = 'b280078a-c0ce-443b-9997-3c66c63ec2f8';

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

  function savePatientPhoto(patientUuid: string, content: string, url: string, date: string, conceptUuid: string) {
    const abortController = new AbortController();

    const formData = new FormData();
    formData.append('patient', patientUuid);
    formData.append('file', dataURItoFile(content), 'OHRIFileConceptTest.png');
    formData.append(
      'json',
      JSON.stringify({
        person: patientUuid,
        concept: conceptUuid,
        groupMembers: [],
        obsDatetime: date,
      }),
    );

    formData.forEach(file => console.log('after loading payload', file));

    openmrsFetch(url, {
      method: 'POST',
      signal: abortController.signal,
      body: formData,
    })
      .then(response => response.json())
      .then(resData => console.log(resData))
      .catch(err => console.log(err.message));

    setCamImage(null);
  }

  async function createAttachment(patientUuid: string, fileToUpload) {
    const attachmentUrl = '/ws/rest/v1/attachment';
    const formData = new FormData();

    formData.append('fileCaption', fileToUpload.fileName);
    formData.append('patient', patientUuid);

    if (fileToUpload.file) {
      formData.append('file', fileToUpload.file);
    } else {
      formData.append('file', new Blob([''], { type: `image/jpeg` }), fileToUpload.fileName);
      formData.append('base64Content', fileToUpload.base64Content);
    }

    console.log(camImage);
    console.log(patientUuid);
    console.log(formData);
    console.log(fileToUpload);

    return openmrsFetch(`${attachmentUrl}`, {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(data => console.log(data))
      .catch(err => console.log(err.message));
  }

  const labelDescription = question.questionOptions.allowedFileTypes
    ? t('fileUploadDescription', `Upload one of the following file types: ${question.questionOptions.allowedFileTypes}`)
    : t('fileUploadDescriptionAny', 'Upload any file type');

  const handleFileChange = event => {
    const newSelectedFiles = Array.from(event.target.files);
    setSelectedFiles(newSelectedFiles);
    setFieldValue(question.id, newSelectedFiles); // Update form field value
  };

  const handleClick = useCallback(() => {
    savePatientPhoto(
      'b280078a-c0ce-443b-9997-3c66c63ec2f8',
      camImage,
      '/ws/rest/v1/obs',
      new Date().toISOString(),
      'dd7bddf7-3bc5-4417-ab7c-3954e58bd63a',
    );
  }, [camImage]);

  const setImages = newImage => {
    setCamImage(newImage);
    setCameraWidgetVisible(false);

    const imagePayload = new FormData();

    imagePayload.append('patient', 'b280078a-c0ce-443b-9997-3c66c63ec2f8');
    imagePayload.append('file', dataURItoFile(newImage), 'OHRIFileConceptTest');
    imagePayload.append(
      'json',
      JSON.stringify({
        person: 'b280078a-c0ce-443b-9997-3c66c63ec2f8',
        concept: 'e65555cb-9afa-4e62-9354-dc197cc397fc',
        groupMembers: [],
        obsDatetime: new Date().toISOString(),
      }),
    );

    // imagePayload.forEach(file => console.log('after loading payload', file));

    setFieldValue(question.id, imagePayload);
    question.value = handler?.handleFieldSubmission(question, imagePayload, encounterContext);
    // console.log(question.value);
  };

  // const fileToUpload = {
  //   base64Content: camImage,
  //   fileName: 'OHRIFormUpload',
  //   fileType: 'jpeg',
  //   fileDescription: 'Image',
  //   status: 'uploading',
  // };

  // createAttachment(patientuuid, fileToUpload);
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
      <div>
        <Button onClick={() => setCameraWidgetVisible(prevState => !prevState)}>Capture image</Button>
        {cameraWidgetVisible && <CameraCapture handleImages={setImages} />}
      </div>

      <div>
        <Button className={styles.saveFile} onClick={handleClick}>
          Save image
        </Button>
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
  );
};

export default File;
