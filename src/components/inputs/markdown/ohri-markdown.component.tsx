import React from 'react';
import ReactMarkdown from 'react-markdown';
import { OHRIFormFieldProps } from '../../../api/types';

const OHRIMarkdown: React.FC<OHRIFormFieldProps> = ({ question }) =>
  !question.isHidden && <ReactMarkdown children={question.value.join('\n')} />;

export default OHRIMarkdown;
