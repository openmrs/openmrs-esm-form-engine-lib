import { OpenmrsResource } from '@openmrs/esm-framework';
import { FieldHelperProps, FieldInputProps, FieldMetaProps } from 'formik';
import { EncounterContext } from '../ohri-form-context';

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
    field: OHRIFormField,
    allFormFields?: Array<OHRIFormField>,
    context?: EncounterContext,
  ) => {};

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

  /**
   * Fetches the previous value for a formfield
   */
  getPreviousValue?: (field: OHRIFormField, encounter: OpenmrsEncounter, allFormFields: Array<OHRIFormField>) => any;
}

/**
 * Field validator abstraction
 */
export interface FieldValidator {
  /**
   * Validates a field and returns validation errors
   */
  validate(field: OHRIFormField, value: any, config?: any): Array<ValidationResult>;
}

export interface ValidationResult {
  resultType: 'warning' | 'error';
  errCode?: string;
  message: string;
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
  encounter?: string | OpenmrsEncounter;
  allowUnspecifiedAll?: boolean;
  defaultPage?: string;
  readonly?: string | boolean;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  markdown?: any;
  postSubmissionActions?: Array<{ actionId: string; config?: Record<string, any> }>;
  formOptions?: {
    usePreviousValueDisabled: boolean;
  };
  version?: string;
}

export interface OHRIFormPage {
  label: string;
  isHidden?: boolean;
  hide?: HideProps;
  sections: Array<OHRIFormSection>;
  isSubform?: boolean;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  readonly?: string | boolean;
  subform?: {
    name?: string;
    package?: string;
    behaviours?: Array<any>;
    form: Omit<OHRIFormSchema, 'postSubmissionActions'>;
  };
}
export interface OHRIFormField {
  label: string;
  type: string;
  questionOptions: OHRIFormQuestionOptions;
  id: string;
  uuid?: string;
  groupId?: string;
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
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  validators?: Array<Record<string, any>>;
  behaviours?: Array<Record<string, any>>;
  questionInfo?: string;
}

export interface OHRIFormFieldProps {
  question: OHRIFormField;
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
}
export interface OHRIFormSection {
  hide?: HideProps;
  label: string;
  isExpanded: string;
  isHidden?: boolean;
  isParentHidden?: boolean;
  questions: Array<OHRIFormField>;
  inlineRendering?: 'single-line' | 'multiline' | 'automatic';
  readonly?: string | boolean;
  reference?: FormReference;
}

export interface OHRIFormQuestionOptions {
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
  answers?: Array<Record<any, any>>;
  weeksList?: string;
  locationTag?: string;
  rows?: number;
  toggleOptions?: { labelTrue: string; labelFalse: string };
  repeatOptions?: { addText?: string; limit?: string; limitExpression?: string; isCloned?: boolean };
  defaultValue?: any;
  calculate?: {
    calculateExpression: string;
  };
  isDateTime?: { labelTrue: boolean; labelFalse: boolean };
  usePreviousValueDisabled?: boolean;
  allowedFileTypes?: Array<string>;
  allowMultiple?: boolean;
  datasource?: { name: string; config?: Record<string, any> };
  isSearchable?: boolean;
}

export type SessionMode = 'edit' | 'enter' | 'view';

export type RenderType =
  | 'select'
  | 'text'
  | 'date'
  | 'number'
  | 'checkbox'
  | 'datetime'
  | 'radio'
  | 'ui-select-extended'
  | 'repeating'
  | 'group'
  | 'content-switcher'
  | 'encounter-location'
  | 'textarea'
  | 'toggle'
  | 'fixed-value'
  | 'file';

export interface PostSubmissionAction {
  applyAction(
    formSession: {
      patient: fhir.Patient;
      encounters: Array<OpenmrsEncounter>;
      sessionMode: SessionMode;
    },
    config?: Record<string, any>,
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
  form?: {
    uuid: string;
    [anythingElse: string]: any;
  };
}

export interface OpenmrsObs extends OpenmrsResource {
  concept: OpenmrsResource;
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
  [anythingElse: string]: any;
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
  dataType: string;
  valueReference: string;
}

export interface DataSource<T> {
  /**
   * Fetches arbitrary data from a data source
   */
  fetchData(searchTerm?: string, config?: Record<string, any>): Promise<Array<T>>;
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
