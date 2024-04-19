import React from 'react';
import ReactMarkdown from 'react-markdown';
import { OHRIFormFieldProps } from '../../../api/types';

const OHRIMarkdown: React.FC<OHRIFormFieldProps> = ({ question }) =>{
  const markdownTypesAllowed = ['h1', 'h2', 'h3','h4', 'h5', 'h6', 'p', 'strong', 'em'];
  const markdownValue = Array.isArray(question.value) ? question.value.join('\n') : question.value;
  return !question.isHidden && <ReactMarkdown children={markdownValue} unwrapDisallowed={true} allowedElements={markdownTypesAllowed}/>;
};
export default OHRIMarkdown;
