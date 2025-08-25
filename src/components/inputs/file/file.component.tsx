import React, { useCallback } from 'react';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { Add } from '@carbon/react/icons';
import styles from './file.scss';
import { type Attachment, type FormFieldInputProps } from '../../../types';
import { useFormProviderContext } from '../../../provider/form-provider';
import { isViewMode } from '../../../utils/common-utils';
import FieldValueView from '../../value/view/field-value-view.component';
import FieldLabel from '../../field-label/field-label.component';
import { showModal, type UploadedFile, useLayoutType } from '@openmrs/esm-framework';
import { FileThumbnail } from './file-thumbnail.component';
import classNames from 'classnames';

const File: React.FC<FormFieldInputProps<Array<Attachment>>> = ({ field, value, setFieldValue }) => {
  const { t } = useTranslation();
  const { sessionMode } = useFormProviderContext();
  const isTablet = useLayoutType() === 'tablet';

  const showImageCaptureModal = useCallback(() => {
    const close = showModal('capture-photo-modal', {
      saveFile: (file: UploadedFile) => {
        if (file.capturedFromWebcam && !file.fileName.includes('.')) {
          file.fileName = `${file.fileName}.png`;
        }
        const currentFiles = value ? value : [];
        setFieldValue([...currentFiles, file]);
        close();
        return Promise.resolve();
      },
      closeModal: () => {
        close();
      },
      allowedExtensions: field.questionOptions.allowedFileTypes,
      multipleFiles: field.questionOptions.allowMultiple,
      collectDescription: true,
    });
  }, [value, field]);

  const handleRemoveFile = useCallback(
    (index: number) => {
      const buffer = [...value];
      const attachment = buffer[index];
      if (attachment.uuid) {
        buffer[index] = {
          ...attachment,
          voided: true,
        };
      } else {
        buffer.splice(index, 1);
      }
      setFieldValue(buffer);
    },
    [value],
  );

  if (isViewMode(sessionMode) && !value) {
    return (
      <FieldValueView label={t(field.label)} value={null} conceptName={field.meta.concept?.display} isInline={false} />
    );
  }

  return (
    <div>
      <div className={classNames(styles.label, 'cds--label')}>
        <FieldLabel field={field} />
      </div>
      {!isViewMode(sessionMode) && (
        <div>
          <Button
            className={styles.uploadButton}
            kind={isTablet ? 'ghost' : 'tertiary'}
            onClick={showImageCaptureModal}
            renderIcon={(props) => <Add size={16} {...props} />}>
            {field.questionOptions.buttonLabel ? t(field.questionOptions.buttonLabel) : t('addFile', 'Add file')}
          </Button>
        </div>
      )}
      <div className={styles.thumbnailGrid}>
        {value &&
          value
            .filter((file) => !file.voided)
            .map((file, index) => (
              <div className={styles.thumbnailContainer}>
                <FileThumbnail
                  title={file.fileName}
                  src={file.base64Content}
                  bytesContentFamily={file.fileType}
                  removeFileCb={() => handleRemoveFile(index)}
                />
              </div>
            ))}
      </div>
    </div>
  );
};

export default File;
