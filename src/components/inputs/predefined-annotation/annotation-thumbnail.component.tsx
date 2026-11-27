import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Edit } from '@carbon/react/icons';
import classNames from 'classnames';
import styles from './annotation-thumbnail.scss';

interface AnnotationThumbnailProps {
  src: string;
  title: string;
  isAnnotated: boolean;
  isEditable: boolean;
  onEdit: () => void;
}

export function AnnotationThumbnail({ src, title, isAnnotated, isEditable, onEdit }: AnnotationThumbnailProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.thumbnailContainer}>
      <div className={classNames(styles.thumbnailBox, { [styles.annotated]: isAnnotated })}>
        <img className={styles.thumbnailImage} src={src} alt={title} />
        {isEditable && (
          <div className={styles.thumbnailButtons}>
            <Button
              kind="ghost"
              size="sm"
              className={styles.editButton}
              onClick={onEdit}
              renderIcon={(props) => <Edit size={16} {...props} />}
              hasIconOnly
              tooltipPosition="left"
              iconDescription={isAnnotated ? t('editAnnotation', 'Edit annotation') : t('annotate', 'Annotate')}
            />
          </div>
        )}
      </div>
      <div className={styles.label}>{title}</div>
    </div>
  );
}
