import React from 'react';
import ReactMarkdown from 'react-markdown';
import { OHRIFormFieldProps } from '../../../api/types';

const OHRIMarkdown: React.FC<OHRIFormFieldProps> = ({ question }) =>{
  if (!question.isHidden) {
    if (typeof question.value === 'string') {
      return <ReactMarkdown>{question.value}</ReactMarkdown>;
    } else if (Array.isArray(question.value)) {
      return <ReactMarkdown children={question.value.join('\n')} />;
    } else {
      return <div>Invalid value type to render</div>;
    }
  }
};
export default OHRIMarkdown;
