import React from 'react';
import { useTranslation } from 'react-i18next';
import { type FormFieldInputProps } from '../../../types';
import MarkdownWrapper from './markdown-wrapper.component';

const Markdown: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();
  const markdownContent =
    typeof field.value === 'string'
      ? t(field.value, { defaultValue: field.value, interpolation: { escapeValue: false } })
      : field.value;

  return !field.isHidden && <MarkdownWrapper markdown={markdownContent} />;
};

export default Markdown;
