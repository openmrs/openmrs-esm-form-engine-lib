import React, { useMemo } from 'react';
import styles from './file-thumbnail.scss';
import { CloseFilled, DocumentPdf, DocumentUnknown } from '@carbon/react/icons';
import { Button } from '@carbon/react';

interface FileThumbnailProps {
  src: string;
  title: string;
  bytesContentFamily: string;
  removeFileCb: () => void;
}

type ThumbnailProps = Omit<FileThumbnailProps, 'bytesContentFamily' | 'removeFileCb'>;

export function FileThumbnail({ bytesContentFamily, removeFileCb, ...thumbnailProps }: FileThumbnailProps) {
  const Thumbnail = useMemo(() => {
    switch (bytesContentFamily) {
      case 'image':
        return ImageThumbnail;
      case 'pdf':
        return PDFThumbnail;
      default:
        return OtherThumbnail;
    }
  }, []);

  return (
    <div className={styles.thumbnail}>
      <Thumbnail {...thumbnailProps} />
      <Button kind="ghost" className={styles.removeButton} onClick={removeFileCb}>
        <CloseFilled size={16} className={styles.closeIcon} />
      </Button>
    </div>
  );
}

function ImageThumbnail(props: ThumbnailProps) {
  return <img className={styles.imageThumbnail} src={props.src} alt={props.title} />;
}

function PDFThumbnail(props: ThumbnailProps) {
  return (
    <div className={styles.pdfThumbnail} role="button" tabIndex={0}>
      <DocumentPdf size={24} />
    </div>
  );
}

function OtherThumbnail(props: ThumbnailProps) {
  return (
    <div className={styles.pdfThumbnail} role="button" tabIndex={0}>
      <DocumentUnknown size={24} />
    </div>
  );
}
