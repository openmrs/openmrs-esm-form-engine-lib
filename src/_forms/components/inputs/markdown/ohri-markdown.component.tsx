import React from 'react';
import { OHRIFormFieldProps } from '../../../types';
import ReactMarkdown from 'react-markdown';

const OHRIMarkdown: React.FC<OHRIFormFieldProps> = ({ question }) =>
  !question.isHidden && <ReactMarkdown children={question.value.join('\n')} />;

export default OHRIMarkdown;
