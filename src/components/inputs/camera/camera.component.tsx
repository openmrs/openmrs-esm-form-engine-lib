import React, { useState } from 'react';
import { Camera } from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import styles from './camera-component.scss';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  ModalHeader,
  ModalBody,
  FileUploader,
  FileUploaderDropContainer,
} from '@carbon/react';

interface CameraCaptureProps {
  handleImages: (state: any) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ handleImages }) => {
  const [view, setView] = useState('');
  const { t } = useTranslation();
  return (
    <>
      <Camera onTakePhoto={dataURI => handleImages(dataURI)} />
    </>

    // <div className={styles.cameraSection}>
    //   {/* <ModalHeader closeModal={closeModal} title={t('addAttachment_title', 'Add Attachment')} /> */}
    //   <ModalBody className={styles.modalBody}>
    //     <Tabs className={styles.tabs}>
    //       <TabList aria-label="Attachments-upload-section">
    //         <Tab onClick={() => setView('upload')}>{t('uploadMedia', 'Upload media')}</Tab>
    //         <Tab onClick={() => setView('camera')}>{t('webcam', 'Webcam')}</Tab>
    //       </TabList>
    //       <TabPanels>
    //         <TabPanel>
    //           {/* <MediaUploaderComponent /> */}
    //           <FileUploaderDropContainer labelText={`Drag and drop to add files`} />
    //         </TabPanel>
    //         <TabPanel>
    //           {/* {view === 'camera' && <CameraComponent mediaStream={mediaStream} stopCameraStream={stopCameraStream} />} */}
    //           <Camera />
    //         </TabPanel>
    //       </TabPanels>
    //     </Tabs>
    //   </ModalBody>
    // </div>
  );
};

export default CameraCapture;
