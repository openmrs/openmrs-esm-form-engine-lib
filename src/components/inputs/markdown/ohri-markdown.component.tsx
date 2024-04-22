import React from 'react';
import { OHRIFormFieldProps } from '../../../api/types';
import  MarkdownWrapper  from './markdown-wrapper.component';

const OHRIMarkdown: React.FC<OHRIFormFieldProps> = ({ question }) =>{
  return !question.isHidden && <MarkdownWrapper markdown={question.value} />;
};
export default OHRIMarkdown;
