import { EncounterContext } from './ohri-form-context';

/**
 * Defines logic that processes field submission and value binding while in edit mode
 */
export interface SubmissionHandler {
  /**
   * Abstraction of the extraction of initial field value from an `encounter`
   *
   * @returns the `initialValue`
   */
  getInitialValue: (encounter: any, field: OHRIFormField, allFormFields?: Array<OHRIFormField>) => {};

  /**
   * Handles field submission.
   *
   * @should Construct a new submission value, edit and handle deletion by voiding.
   * @returns the `submissionValue`
   */
  handleFieldSubmission: (field: OHRIFormField, value: any, context: EncounterContext) => {};

  /**
   * Extracts value to be displayed while in `view` mode
   *
   * @returns the `displayValue`
   */
  getDisplayValue: (field: OHRIFormField, value: any) => any;
}

/**
 * Field validator abstraction
 */
export interface FieldValidator {
  /**
   * Validates a field and returns validation errors
   */
  validate(field: OHRIFormField, value: any): { errCode: string; errMessage: string }[];
}

export interface EncounterDescriptor {
  location?: any; // string | { name: string; uuid: string };
  obs?: Array<any>; // TODO: add obs descriptor
  orders?: Array<any>;
  uuid?: string;
  encounterProviders?: Array<{ provider: any; encounterRole: string }>;
  encounterDatetime?: Date;
  encounterType?: string;
  patient?: string;
}

export interface HideProps {
  hideWhenExpression: string;
}

export interface OHRIFormSchema {
  name: string;
  pages: Array<OHRIFormPage>;
  processor: string;
  uuid: string;
  referencedForms: [];
  encounterType: string;
  encounter?: string | EncounterDescriptor;
  allowUnspecifiedAll?: boolean;
  defaultPage?: string;
}

export interface OHRIFormPage {
  label: string;
  isHidden?: boolean;
  hide?: HideProps;
  sections: Array<OHRIFormSection>;
  isSubform?: boolean;
  subform?: { name?: string; package?: string; behaviours?: Array<any>; form: OHRIFormSchema };
}
export interface OHRIFormField {
  label: string;
  type: string;
  questionOptions: OHRIFormQuestionOptions;
  id: string;
  questions?: Array<OHRIFormField>;
  value?: any;
  hide?: HideProps;
  isHidden?: boolean;
  isParentHidden?: boolean;
  fieldDependants?: Set<string>;
  pageDependants?: Set<string>;
  sectionDependants?: Set<string>;
  required?: boolean;
  unspecified?: boolean;
  disabled?: boolean;
  readonly?: string | boolean;
  behaviours?: Array<Record<string, any>>;
}

export interface OHRIFormFieldProps {
  question: OHRIFormField;
  onChange: (fieldName: string, value: any) => {};
  handler: SubmissionHandler;
}
export interface OHRIFormSection {
  label: string;
  isExpanded: string;
  isHidden?: boolean;
  isParentHidden?: boolean;
  questions: Array<OHRIFormField>;
}

export interface OHRIFormQuestionOptions {
  rendering: RenderType;
  concept?: string;
  max?: string;
  min?: string;
  showDate?: string;
  conceptMappings?: Array<Record<any, any>>;
  answers?: Array<Record<any, any>>;
  weeksList?: string;
  locationTag?: string;
  rows?: number;
  toggleOptions?: { labelTrue: string; labelFalse: string };
  repeatOptions?: { addText?: string };
  defaultValue?: any;
}

export type SessionMode = 'edit' | 'enter' | 'view';

export type RenderType =
  | 'select'
  | 'text'
  | 'date'
  | 'number'
  | 'checkbox'
  | 'radio'
  | 'ui-select-extended'
  | 'repeating'
  | 'group'
  | 'content-switcher'
  | 'encounter-location'
  | 'textarea'
  | 'toggle'
  | 'fixed-value';
