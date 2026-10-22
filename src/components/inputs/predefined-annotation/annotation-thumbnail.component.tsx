import React from 'react';
import { Button } from '@carbon/react';
import { Edit } from '@carbon/react/icons';
import classNames from 'classnames';
import styles from './annotation-thumbnail.scss';

interface AnnotationThumbnailProps {
  src: string;
  title: string;
  isAnnotated?: boolean;
  onEdit?: () => void;
}

export function AnnotationThumbnail({ src, title, isAnnotated, onEdit }: AnnotationThumbnailProps) {
  return (
    <div className={styles.thumbnailContainer}>
      <div className={classNames(styles.thumbnailBox, { [styles.annotated]: isAnnotated })}>
        <img className={styles.thumbnailImage} src={src} alt={title} />
        {onEdit && (
          <div className={styles.thumbnailButtons}>
            <Button
              kind="ghost"
              size="sm"
              className={styles.editButton}
              onClick={onEdit}
              renderIcon={(props) => <Edit size={16} {...props} />}
              hasIconOnly
              tooltipPosition="left"
              iconDescription={isAnnotated ? 'Edit annotation' : 'Annotate'}
            />
          </div>
        )}
      </div>
      <div className={styles.label}>{title}</div>
    </div>
  );
}
