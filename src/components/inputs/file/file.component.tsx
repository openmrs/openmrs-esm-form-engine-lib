import React, { useState } from 'react';
import { FileUploader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OHRIFormFieldProps } from '../../../api/types';
import { useField } from 'formik';
import { OHRIFormContext } from '../../../ohri-form-context';

interface FileProps extends OHRIFormFieldProps {}

const File: React.FC<FileProps> = ({ question, onChange, handler }) => {
  const { t } = useTranslation();
  const [field, meta] = useField(question.id);
  const { setFieldValue } = React.useContext(OHRIFormContext);

  const labelDescription = question.questionOptions.allowedFileTypes
    ? t('fileUploadDescription', `Upload one of the following file types: ${question.questionOptions.allowedFileTypes}`)
    : t('fileUploadDescriptionAny', 'Upload any file type');

  const [selectedFiles, setSelectedFiles] = useState([]); // Add state for selected files

  const handleFileChange = (event) => {
    const newSelectedFiles = Array.from(event.target.files);
    setSelectedFiles(newSelectedFiles);
    setFieldValue(question.id, newSelectedFiles); // Update form field value
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
              {file.type.includes('image') ? <img src={URL.createObjectURL(file)} alt="Preview" /> : <span>File Icon</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default File;
