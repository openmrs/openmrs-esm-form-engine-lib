import React, { useState } from 'react';
import { FileUploader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OHRIFormFieldProps, ValidationResult } from '../../../api/types';
import { useField } from 'formik';
import OHRIAnnotate from '../annotate/ohri-annotate.component';
import { createAttachment } from '../../../api/attachments.resource';
import { usePatient } from '@openmrs/esm-framework';

interface FileProps extends OHRIFormFieldProps {}

const File: React.FC<FileProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);

  const labelDescription = question.questionOptions.allowedFileTypes
    ? t('fileUploadDescription', `Upload one of the following file types: ${question.questionOptions.allowedFileTypes}`)
    : t('fileUploadDescriptionAny', 'Upload any file type');

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [attachmentId, setAttachmentId] = useState('');
  // Get the patientUuid from the URL parameters
  const { patientUuid } = usePatient();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelectedFiles: File[] = Array.from(event.target.files);
    setSelectedFiles(newSelectedFiles);

    // Upload the file and create the attachment
    const attachmentResponse = await createAttachment(patientUuid, {
      file: newSelectedFiles[0],
      fileName: newSelectedFiles[0].name,
      base64Content: '',
      fileType: '',
      fileDescription: '',
    });

    // Get the attachment ID from the response
    const attachmentId = attachmentResponse?.data?.uuid;

    // Store the attachment ID in component state
    setAttachmentId(attachmentId);

    // Call the onChange prop to pass the selected file to the parent component
    if (onChange) {
      const fieldValue = field.value;
      const isTouched = meta.touched;
      const fieldId = question.id;

      onChange(newSelectedFiles[0].name, fieldId, fieldValue, (warnings: ValidationResult[]) => {});

      // Set the image URL for display in OHRIAnnotate component
      if (newSelectedFiles[0].type.includes('image')) {
        const reader = new FileReader();
        reader.onload = e => {
          const base64ImageData = e.target.result as string;
          // setImageUrl(base64ImageData);
          const updatedSelectedFiles = selectedFiles.map((file, index) => {
            if (index === 0) {
              return {
                ...file,
                imageUrl: base64ImageData,
              };
            }
            return file;
          });
          setSelectedFiles(updatedSelectedFiles);
        };
        reader.readAsDataURL(newSelectedFiles[0]);
      }
    }
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

      {/* Display previews of selected files */}
      {selectedFiles.length > 0 && (
        <div className="file-previews">
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-preview">
              <p>{file.name}</p>
              {file.type.includes('image') ? (
                <div>
                  <img src={file.imageUrl} alt="Preview" />
                  <OHRIAnnotate imageUrl={file.imageUrl} attachmentId={attachmentId} />
                </div>
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
