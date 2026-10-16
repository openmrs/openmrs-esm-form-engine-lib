import React from 'react';
import styles from './annotation-thumbnail.scss';
import { Edit, Reset } from '@carbon/react/icons';
import { Button } from '@carbon/react';

interface AnnotationThumbnailProps {
  src: string;
  title: string;
  resetAnnotation?: () => void;
  editTemplate?: (imageSrc: string) => void;
}

export function AnnotationThumbnail({ src, title, resetAnnotation, editTemplate }: AnnotationThumbnailProps) {
  const handleResetAnnotation = () => {
    resetAnnotation();
  };

  const handleEditAnnotation = () => {
    editTemplate(src);
  };

  return (
    <div className={styles.thumbnailContainer}>
      <div className={styles.thumbnailBox}>
        <img className={styles.thumbnailImage} src={src} alt={title} />

        <div className={styles.thumbnailButtons}>
          <Button
            kind="ghost"
            size="sm"
            className={styles.thumbnailButton}
            onClick={handleResetAnnotation}
            renderIcon={(props) => <Reset size={16} {...props} />}
            hasIconOnly
            tooltipPosition="bottom"
            iconDescription="Reset"
          />

          <Button
            kind="ghost"
            size="sm"
            className={styles.thumbnailButton}
            onClick={handleEditAnnotation}
            renderIcon={(props) => <Edit size={16} {...props} />}
            hasIconOnly
            tooltipPosition="bottom"
            iconDescription="Edit"
          />
        </div>
      </div>

      <div className={styles.label}>{title}</div>
    </div>
  );
}
