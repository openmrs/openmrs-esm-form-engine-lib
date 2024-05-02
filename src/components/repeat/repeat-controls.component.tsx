import { Button } from '@carbon/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { type FormField } from '../../types';
import { disableRepeatAddButton } from './helpers';
import styles from './repeat-controls.scss';
interface RepeatingControlsProps {
  rows: FormField[];
  question: FormField;
  questionIndex: number;
  handleDelete: () => void;
  handleAdd: () => void;
}

function RepeatControls({ question, rows, handleDelete, handleAdd, questionIndex }: RepeatingControlsProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.actionButtons}>
      {questionIndex > 0 && (
        <Button className={styles.button} kind="danger" onClick={handleDelete}>
          <span>{t('remove', 'Remove')}</span>
        </Button>
      )}
      {questionIndex === rows.length - 1 && (
        <Button
          className={styles.button}
          iconDescription={t('add', 'Add')}
          kind="primary"
          disabled={disableRepeatAddButton(question.questionOptions.repeatOptions?.limit, rows.length)}
          onClick={handleAdd}>
          <span>{question.questionOptions.repeatOptions?.addText || t('add', 'Add')}</span>
        </Button>
      )}
    </div>
  );
}

export default RepeatControls;
