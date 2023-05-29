import React from 'react';
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

  return (
    <FileUploader
      {...field}
      accept={question.questionOptions.allowedFileTypes ?? []}
      buttonKind="primary"
      buttonLabel={t('addFile', 'Add files')}
      filenameStatus="edit"
      iconDescription="Clear file"
      labelDescription={labelDescription}
      labelTitle={t('fileUploadTitle', 'Upload')}
      multiple={question.questionOptions.allowMultiple}
      onChange={event => setFieldValue(question.id, event.target.files[0])}
    />
  );
};

export default File;
