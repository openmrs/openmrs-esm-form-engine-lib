import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type OpenmrsEncounter } from './domain';
import { type ValidationResult } from '..';

export interface FormSchema {
  name: string;
  pages: Array<FormPage>;
  processor: string;
  uuid: string;
  referencedForms: Array<ReferencedForm>;
  encounterType: string;
  encounter?: string | OpenmrsEncounter;
  allowUnspecifiedAll?: boolean;
  defaultPage?: string;
  readonly?: string | boolean;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  markdown?: any;
  postSubmissionActions?: Array<{ actionId: string; enabled?: string; config?: Record<string, any> }>;
  formOptions?: {
    usePreviousValueDisabled: boolean;
  };
  version?: string;
  translations?: Record<string, string>;
  meta?: {
    programs?: {
      hasProgramFields?: boolean;
      [anythingElse: string]: any;
    };
  };
}

export interface FormPage {
  label: string;
  isHidden?: boolean;
  hide?: HideProps;
  sections: Array<FormSection>;
  isSubform?: boolean;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  readonly?: string | boolean;
  subform?: {
    name?: string;
    package?: string;
    behaviours?: Array<any>;
    form: Omit<FormSchema, 'postSubmissionActions'>;
  };
}

export interface FormSection {
  hide?: HideProps;
  label: string;
  isExpanded: string;
  isHidden?: boolean;
  isParentHidden?: boolean;
  questions: Array<FormField>;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  readonly?: string | boolean;
  reference?: FormReference;
}

export interface FormField {
  label: string;
  type: string;
  questionOptions: FormQuestionOptions;
  datePickerFormat?: 'both' | 'calendar' | 'timer';
  id: string;
  questions?: Array<FormField>;
  value?: any;
  hide?: HideProps;
  isHidden?: boolean;
  isParentHidden?: boolean;
  fieldDependents?: Set<string>;
  pageDependents?: Set<string>;
  sectionDependents?: Set<string>;
  isRequired?: boolean;
  required?: string | boolean | RequiredFieldProps;
  unspecified?: boolean;
  isDisabled?: boolean;
  disabled?: boolean | Omit<DisableProps, 'isDisabled'>;
  readonly?: string | boolean;
  isReadonly?: boolean;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  validators?: Array<Record<string, any>>;
  behaviours?: Array<Record<string, any>>;
  questionInfo?: string;
  historicalExpression?: string;
  constrainMaxWidth?: boolean;
  inlineMultiCheckbox?: boolean;
  meta?: QuestionMetaProps;
}

export interface FormFieldInputProps {
  value: any;
  field: FormField;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  /**
   * Callback function to handle changes to the field value in the React Hook Form context.
   *
   * @param value - The new value of the field.
   */
  setFieldValue: (value: any) => void;
}

export interface HideProps {
  hideWhenExpression: string;
}

export interface DisableProps {
  disableWhenExpression?: string;
  isDisabled?: boolean;
}

export interface RequiredFieldProps {
  type: string;
  message?: string;
  referenceQuestionId: string;
  referenceQuestionAnswers: Array<string>;
}

export interface RepeatOptions {
  addText?: string;
  limit?: string;
  limitExpression?: string;
}

export interface QuestionMetaProps {
  concept?: OpenmrsResource;
  previousValue?: any;
  submission?: {
    voidedValue?: any;
    newValue?: any;
    unspecified?: boolean;
    errors?: any[];
    warnings?: any[];
  };
  repeat?: {
    isClone?: boolean;
    wasDeleted?: boolean;
  };
  groupId?: string;
  [anythingElse: string]: any;
}

export interface FormQuestionOptions {
  extensionId?: string;
  extensionSlotName?: string;
  rendering: RenderType;
  concept?: string;
  /**
   * max and min are used to validate number field values
   */
  max?: string;
  min?: string;
  /**
   * maxLength and maxLength are used to validate text field length
   */
  isTransient?: boolean;
  maxLength?: string;
  minLength?: string;
  showDate?: string;
  shownDateOptions?: { validators?: Array<Record<string, any>>; hide?: { hideWhenExpression: string } };
  answers?: Array<QuestionAnswerOption>;
  weeksList?: string;
  locationTag?: string;
  disallowDecimals?: boolean;
  rows?: number;
  toggleOptions?: { labelTrue: string; labelFalse: string };
  repeatOptions?: RepeatOptions;
  defaultValue?: any;
  calculate?: {
    calculateExpression: string;
  };
  isDateTime?: { labelTrue: boolean; labelFalse: boolean };
  enablePreviousValue?: boolean;
  allowedFileTypes?: Array<string>;
  allowMultiple?: boolean;
  datasource?: { name: string; config?: Record<string, any> };
  isSearchable?: boolean;
  workspaceName?: string;
  buttonLabel?: string;
  identifierType?: string;
  orderSettingUuid?: string;
  orderType?: string;
  selectableOrders?: Array<Record<any, any>>;
  programUuid?: string;
  workflowUuid?: string;
  showComment?: boolean;
  comment?: string;
  orientation?: 'vertical' | 'horizontal';
  shownCommentOptions?: { validators?: Array<Record<string, any>>; hide?: { hideWhenExpression: string } };
}

export interface QuestionAnswerOption {
  hide?: HideProps;
  disable?: DisableProps;
  label?: string;
  concept?: string;
  [key: string]: any;
}
export type RenderType =
  | 'checkbox'
  | 'content-switcher'
  | 'date'
  | 'datetime'
  | 'encounter-location'
  | 'encounter-provider'
  | 'encounter-role'
  | 'fixed-value'
  | 'file'
  | 'group'
  | 'number'
  | 'radio'
  | 'repeating'
  | 'select'
  | 'text'
  | 'textarea'
  | 'toggle'
  | 'ui-select-extended'
  | 'workspace-launcher'
  | 'fixed-value'
  | 'file'
  | 'markdown'
  | 'extension-widget'
  | 'select-concept-answers';

export interface FormReference {
  form: string;
  page: string;
  section: string;
  excludeQuestions?: Array<string>;
}

export interface ReferencedForm {
  formName: string;
  alias: string;
}

export type FormExpanded = boolean | undefined;
