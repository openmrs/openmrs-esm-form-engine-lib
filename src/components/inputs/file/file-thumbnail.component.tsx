import React, { type ComponentProps, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './file-thumbnail.scss';
import { Close, DocumentPdf, DocumentUnknown } from '@carbon/react/icons';
import { Button, Tooltip } from '@carbon/react';

interface FileThumbnailProps {
  src: string;
  title: string;
  bytesContentFamily: string;
  removeFileCb: () => void;
}

type ThumbnailProps = Omit<FileThumbnailProps, 'bytesContentFamily' | 'removeFileCb'>;

export function FileThumbnail({ bytesContentFamily, removeFileCb, ...thumbnailProps }: FileThumbnailProps) {
  const { t } = useTranslation();

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
    <div className={styles.card}>
      <div className={styles.thumbnail}>
        <Thumbnail {...thumbnailProps} />
      </div>
      <div className={styles.caption}>
        <FileName name={thumbnailProps.title} />
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          renderIcon={(props: ComponentProps<typeof Close>) => <Close size={16} {...props} />}
          iconDescription={t('removeAttachment', 'Remove attachment')}
          onClick={removeFileCb}
          tooltipPosition="bottom"
        />
      </div>
    </div>
  );
}

/**
 * Shows the file name, and puts the whole of it in a tooltip once the caption is too narrow to hold
 * it. This mirrors Carbon's own `FileUploaderItem`: measure the text and only wrap it in a `Tooltip`
 * when it is actually clipped, so a name that already fits does not grow a tooltip it does not need.
 * The trigger is a button rather than a bare span, which is what puts the full name within reach of
 * a keyboard. Carbon additionally sets a native `title` on the same element; that draws the browser's
 * own tooltip on top of the Carbon one, so it is left off here.
 */
function FileName({ name }: { name: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isClipped, setIsClipped] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    setIsClipped(element ? element.offsetWidth < element.scrollWidth : false);
  }, [name]);

  const text = (
    <span className={styles.fileName} ref={textRef}>
      {name}
    </span>
  );

  if (!isClipped) {
    return text;
  }

  return (
    <Tooltip autoAlign align="bottom" className={styles.fileNameTooltip} label={name}>
      <button className={styles.fileNameButton} type="button">
        {text}
      </button>
    </Tooltip>
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
