import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type FieldHelperProps, type FieldInputProps, type FieldMetaProps } from 'formik';
import { type EncounterContext } from './form-context';

/**
 * Defines logic that processes field submission and value binding while in edit mode
 */
export interface SubmissionHandler {
  /**
   * Abstraction of the extraction of initial field value from an `encounter`
   *
   * @returns the `initialValue`
   */
  getInitialValue: (
    encounter: OpenmrsEncounter,
    field: FormField,
    allFormFields?: Array<FormField>,
    context?: EncounterContext,
  ) => {};

  /**
   * Handles field submission.
   *
   * @should Construct a new submission value, edit and handle deletion by voiding.
   * @returns the `submissionValue`
   */
  handleFieldSubmission: (field: FormField, value: any, context: EncounterContext) => {};

  /**
   * Extracts value to be displayed while in `view` mode
   *
   * @returns the `displayValue`
   */
  getDisplayValue: (field: FormField, value: any) => any;

  /**
   * Fetches the previous value for a form field
   */
  getPreviousValue?: (field: FormField, encounter: OpenmrsEncounter, allFormFields: Array<FormField>) => any;
}

/**
 * Field validator abstraction
 */
export interface FormFieldValidator {
  /**
   * Validates a field and returns validation errors
   */
  validate(field: FormField, value?: any, config?: any): Array<ValidationResult>;
}

export interface ValidationResult {
  resultType: 'warning' | 'error';
  errCode?: string;
  message: string;
}

export interface HideProps {
  hideWhenExpression: string;
}

export interface DisableProps {
  disableWhenExpression?: string;
  isDisabled?: boolean;
}

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

export interface FormField {
  label: string;
  type: string;
  questionOptions: FormQuestionOptions;
  datePickerFormat?: 'both' | 'calendar' | 'timer';
  id: string;
  groupId?: string;
  questions?: Array<FormField>;
  value?: any;
  hide?: HideProps;
  isHidden?: boolean;
  isParentHidden?: boolean;
  fieldDependants?: Set<string>;
  pageDependants?: Set<string>;
  sectionDependants?: Set<string>;
  isRequired?: boolean;
  required?: string | boolean | RequiredFieldProps;
  unspecified?: boolean;
  isDisabled?: boolean;
  disabled?: boolean | Omit<DisableProps, 'isDisabled'>;
  readonly?: string | boolean;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  validators?: Array<Record<string, any>>;
  behaviours?: Array<Record<string, any>>;
  questionInfo?: string;
  historicalExpression?: string;
  constrainMaxWidth?: boolean;
  inlineMultiCheckbox?: boolean;
  meta?: QuestionMetaProps;
}

export interface RequiredFieldProps {
  type: string;
  message?: string;
  referenceQuestionId: string;
  referenceQuestionAnswers: Array<string>;
}

export interface previousValue {
  field: string;
  value: string | number | Date | boolean | previousValue[];
}

export interface FormFieldProps {
  question: FormField;
  onChange: (
    fieldName: string,
    value: any,
    setErrors: (errors: Array<ValidationResult>) => void,
    setWarnings: (warnings: Array<ValidationResult>) => void,
    isUnspecified?: boolean,
  ) => void;
  handler: SubmissionHandler;
  // This is of util to components defined out of the engine
  useField?: (fieldId: string) => [FieldInputProps<any>, FieldMetaProps<any>, FieldHelperProps<any>];
  previousValue?: string | number | Date | boolean | previousValue[];
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

export interface QuestionAnswerOption {
  hide?: HideProps;
  disable?: DisableProps;
  label?: string;
  concept?: string;
  [key: string]: any;
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
  attributeType?: string;
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

export interface PersonAttribute {
  uuid?: string;
  value: string | { uuid: string; display: string };
  attributeType?: string;
}

export type SessionMode = 'edit' | 'enter' | 'view' | 'embedded-view';

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
  | 'select-concept-answers';

export interface PostSubmissionAction {
  applyAction(
    formSession: {
      patient: fhir.Patient;
      encounters: Array<OpenmrsEncounter>;
      sessionMode: SessionMode;
    },
    config?: Record<string, any>,
    enabled?: string,
  ): void;
}

// OpenMRS Type Definitions
export interface OpenmrsEncounter {
  uuid?: string;
  encounterDatetime?: string | Date;
  patient?: OpenmrsResource | string;
  location?: OpenmrsResource | string;
  encounterType?: OpenmrsResource | string;
  obs?: Array<OpenmrsObs>;
  orders?: Array<OpenmrsResource>;
  voided?: boolean;
  visit?: OpenmrsResource | string;
  encounterProviders?: Array<Record<string, any>>;
  form?: OpenmrsFormResource;
}

export interface OpenmrsObs extends OpenmrsResource {
  concept: any;
  obsDatetime: string | Date;
  obsGroup: OpenmrsObs;
  groupMembers: Array<OpenmrsObs>;
  comment: string;
  location: OpenmrsResource;
  order: OpenmrsResource;
  encounter: OpenmrsResource;
  voided: boolean;
  value: any;
  formFieldPath: string;
  formFieldNamespace: string;
  status: string;
  interpretation: string;
}

export interface OpenmrsForm {
  uuid: string;
  name: string;
  encounterType: OpenmrsResource;
  version: string;
  description: string;
  published: boolean;
  retired: boolean;
  resources: Array<OpenmrsFormResource>;
}

export interface OpenmrsFormResource extends OpenmrsResource {
  dataType?: string;
  valueReference?: string;
}

export interface DataSource<T> {
  /**
   * Fetches arbitrary data from a data source
   */
  fetchData(searchTerm?: string, config?: Record<string, any>, uuid?: string): Promise<Array<T>>;
  /**
   * Maps a data source item to an object with a uuid and display property
   */
  toUuidAndDisplay(item: T): OpenmrsResource;
}

export interface ControlTemplate {
  name: string;
  datasource: DataSourceParameters;
}

export interface DataSourceParameters {
  name: string;
  config?: Record<string, any>;
}

export interface AttachmentResponse {
  bytesContentFamily: string;
  bytesMimeType: string;
  comment: string;
  dateTime: string;
  uuid: string;
}

export interface Attachment {
  id: string;
  src: string;
  title: string;
  description: string;
  dateTime: string;
  bytesMimeType: string;
  bytesContentFamily: string;
}

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

export type RepeatObsGroupCounter = {
  fieldId: string;
  obsGroupCount: number;
  limit?: number;
};

export interface PatientIdentifier {
  uuid?: string;
  identifier: string;
  identifierType?: string;
  location?: string;
  preferred?: boolean;
}

/**
 * A form schema transformer is used to bridge the gap caused by different variations of form schemas
 * in the OpenMRS JSON schema-based form-entry world. It fine-tunes custom schemas to be compliant
 * with the React Form Engine.
 */
export interface FormSchemaTransformer {
  /**
   * Transforms the raw schema to be compatible with the React Form Engine.
   */
  transform: (form: FormSchema) => FormSchema;
}

export interface Order {
  concept: string;
  orderer: string;
  uuid?: string;
  formFieldPath?: string;
  type?: string;
  action?: string;
  urgency?: string;
  dateActivated?: string;
  careSetting?: string;
  groupMembers?: Order[];
  encounter?: string;
  patient?: string;
  orderNumber?: string;
  voided?: boolean;
}

export interface ProgramState {
  name?: string;
  startDate?: string;
  uuid?: string;
  concept: OpenmrsResource;
  programWorkflow: OpenmrsResource;
}

export interface ProgramWorkflowState {
  state: ProgramState;
  endDate?: string;
  startDate?: string;
}

export interface PatientProgram extends OpenmrsResource {
  patient?: OpenmrsResource;
  program?: OpenmrsResource;
  dateEnrolled?: string;
  dateCompleted?: string;
  location?: OpenmrsResource;
  states?: Array<ProgramWorkflowState>;
}

export interface PatientProgramPayload {
  program?: string;
  uuid?: string;
  display?: string;
  patient?: string;
  dateEnrolled?: string;
  dateCompleted?: string;
  location?: string;
  states?: Array<{
    state?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export type FormExpanded = boolean | undefined;
