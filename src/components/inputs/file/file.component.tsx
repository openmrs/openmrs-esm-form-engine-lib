import React, { useState } from 'react';
import { FileUploader, Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OHRIFormFieldProps } from '../../../api/types';
import { useField } from 'formik';
import { OHRIFormContext } from '../../../ohri-form-context';
import CameraCapture from '../camera/camera.component';
import { openmrsFetch } from '@openmrs/esm-framework';
import { Blob } from 'buffer';

interface FileProps extends OHRIFormFieldProps {}

const File: React.FC<FileProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const [cameraWidgetVisible, setCameraWidgetVisible] = useState(false);
  const [field, meta] = useField(question.id);
  const { setFieldValue } = React.useContext(OHRIFormContext);
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
    return new File([blob], 'patient-photo.png');
  }

  function savePatientPhoto(patientUuid: string, content: string, url: string, date: string, conceptUuid: string) {
    const abortController = new AbortController();

    const formData = new FormData();
    formData.append('patient', patientUuid);
    formData.append('file', dataURItoFile(content));
    formData.append(
      'json',
      JSON.stringify({
        person: patientUuid,
        concept: conceptUuid,
        groupMembers: [],
        obsDatetime: date,
      }),
    );

    return openmrsFetch(url, {
      method: 'POST',
      signal: abortController.signal,
      body: formData,
    }).then(response => console.log(response.json()));
  }

  const labelDescription = question.questionOptions.allowedFileTypes
    ? t('fileUploadDescription', `Upload one of the following file types: ${question.questionOptions.allowedFileTypes}`)
    : t('fileUploadDescriptionAny', 'Upload any file type');

  const handleFileChange = event => {
    const newSelectedFiles = Array.from(event.target.files);
    setSelectedFiles(newSelectedFiles);
    setFieldValue(question.id, newSelectedFiles); // Update form field value
  };

  const handleClick = () => {
    if (camImage) {
      return savePatientPhoto(
        'b280078a-c0ce-443b-9997-3c66c63ec2f8',
        dataURItoFile(camImage),
        '/ws/rest/v1/obs',
        new Date().toISOString(),
        'dd7bddf7-3bc5-4417-ab7c-3954e58bd63aß',
      );
    }
  };

  const setImages = newImage => {
    setCamImage(newImage);
    setCameraWidgetVisible(false);
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

      <Button onClick={() => setCameraWidgetVisible(prevState => !prevState)}>Capture image</Button>
      {cameraWidgetVisible && <CameraCapture handleImages={setImages} />}
      <Button onClick={handleClick}>Save image</Button>
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
