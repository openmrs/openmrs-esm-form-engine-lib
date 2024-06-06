import { FormSection } from 'src/types';
import { isTrue } from './boolean-utils';

export function isSectionExpanded(section: FormSection, isFormExpanded): boolean {
  let sectionIsExpanded = true;

  if (isFormExpanded !== undefined) {
    sectionIsExpanded = isFormExpanded;
  }
  if (!isTrue(section?.isExpanded)) {
    if (section?.isExpanded !== undefined && section?.isExpanded !== null) sectionIsExpanded = false;
  }
  return sectionIsExpanded;
}
