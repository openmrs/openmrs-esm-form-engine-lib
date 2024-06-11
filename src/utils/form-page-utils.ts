import { type FormExpanded, type FormSection } from '../types';
import { isTrue } from './boolean-utils';

export function isSectionExpanded(section: FormSection, isFormExpanded: FormExpanded): FormExpanded {
  if (isFormExpanded !== undefined) {
    return isFormExpanded;
  }

  if (section?.isExpanded !== undefined && section?.isExpanded !== null) {
    return isTrue(section.isExpanded);
  }
  return true;
}
