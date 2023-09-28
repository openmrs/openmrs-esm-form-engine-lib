import React, { useState } from 'react';
import { Camera } from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import { useTranslation } from 'react-i18next';

interface CameraCaptureProps {
  handleImages: (state: any) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ handleImages }) => {
  return (
    <>
      <Camera onTakePhoto={dataURI => handleImages(dataURI)} />
    </>
  );
};

export default CameraCapture;
