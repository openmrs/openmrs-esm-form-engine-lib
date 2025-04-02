import React from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownWrapper from './markdown-wrapper.component';
import { type FormFieldInputProps } from '../../../types';

const Markdown: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();
  return !field.isHidden && <MarkdownWrapper markdown={t(field.value)} />;
};
export default Markdown;
