import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FormFieldProps } from '../../../types';

const Markdown: React.FC<FormFieldProps> = ({ question }) =>
  !question.isHidden && <ReactMarkdown children={question.value.join('\n')} />;

export default Markdown;
