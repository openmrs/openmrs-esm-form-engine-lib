import { FormProcessor } from '../processors/form-processor';
import { type FormContextProps } from './form-provider';

export async function doSubmitForm(context: FormContextProps) {
  // TODO: implement form submission
  return await context.processor.processSubmission();
}

export function validateForm(context: FormContextProps) {
  // TODO: implement form validation
  return true;
}
