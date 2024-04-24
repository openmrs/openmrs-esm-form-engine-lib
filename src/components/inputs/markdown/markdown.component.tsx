import React from 'react';
import MarkdownWrapper from './markdown-wrapper.component';
import { FormFieldProps } from '../../../types';

const Markdown: React.FC<FormFieldProps> = ({ question }) => {
  return !question.isHidden && <MarkdownWrapper markdown={question.value} />;
};
export default Markdown;
