import React from 'react';
import MarkdownWrapper from './markdown-wrapper.component';
import { type FormFieldInputProps } from '../../../types';

const Markdown: React.FC<FormFieldInputProps> = ({ field }) => {
  return !field.isHidden && <MarkdownWrapper markdown={field.value} />;
};
export default Markdown;
