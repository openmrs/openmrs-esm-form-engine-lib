import React from 'react';
import Webcam from 'react-webcam';
import { Button } from '@carbon/react';
import { Camera as CameraIcon } from '@carbon/react/icons';

import styles from './camera.scss';

interface CameraProps {
  handleImages: (state: any) => void;
}

const Camera: React.FC<CameraProps> = ({ handleImages }) => {
  const webcamRef = React.useRef(null);

  const capture = React.useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    handleImages(imageSrc);
  }, [webcamRef]);

  const videoConstraints = {
    facingMode: 'user',
  };

  return (
    <div>
      <Webcam audio={false} ref={webcamRef} screenshotFormat="image/png" videoConstraints={videoConstraints} />
      <div className={styles.captureButton}>
        <Button onClick={capture} type="button" hasIconOnly renderIcon={() => <CameraIcon size={24} />}></Button>
      </div>
    </div>
  );
};

export default Camera;
