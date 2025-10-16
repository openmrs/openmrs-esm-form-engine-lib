import React from 'react';
import { useTranslation } from 'react-i18next';
import { type FormFieldInputProps } from '../../../types';
import MarkdownWrapper from './markdown-wrapper.component';

const Markdown: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();

  const translateMarkdown = (markdownContent: string | string[]): string => {
    if (Array.isArray(markdownContent)) {
      return markdownContent
        .map((line) => t(line, { defaultValue: line, interpolation: { escapeValue: false } }))
        .join('\n\n');
    }

    return typeof markdownContent === 'string'
      ? t(markdownContent, { defaultValue: markdownContent, interpolation: { escapeValue: false } })
      : markdownContent;
  };

  return !field.isHidden && <MarkdownWrapper markdown={translateMarkdown(field.value)} />;
};

export default Markdown;
