import React from 'react';
import { useTranslation } from 'react-i18next';
import {type FormField} from '../../types';
import Tooltip from '../inputs/tooltip/tooltip.component';

import styles from './question-label.scss';



interface QuestionLabelContainerProps {
  question: FormField; 
}
 

const QuestionLabelContainer: React.FC<QuestionLabelContainerProps> = ({ question }) => {
  const { t } = useTranslation();
  const labelText = t(question.label);
  return (
    <div className={styles.questionLabel}> 
      <span>{labelText}</span>
      {question.isRequired  &&  <span title={t('required', 'Required')} className={styles.required}> * </span>}
      {question.questionInfo &&  <Tooltip field={question} />}
    </div>
  );
};

export default QuestionLabelContainer;
