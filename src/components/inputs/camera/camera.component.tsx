import React, { useState } from 'react';
import { Camera } from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import { useTranslation } from 'react-i18next';
import { Tabs, Tab, TabList, TabPanels, TabPanel, ModalHeader, ModalBody, ModalFooter } from '@carbon/react';

interface CameraCaptureProps {
  handleImages: (state: any) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ handleImages }) => {
  const { t } = useTranslation();

  return (
    <div>
      <ModalHeader title={t('addAttachment_title', 'Add Attachment')} />
      <ModalBody>
        <Camera onTakePhoto={dataURI => handleImages(dataURI)} />
      </ModalBody>
    </div>
  );
};

export default CameraCapture;
