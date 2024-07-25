import { type LayoutType, type OpenmrsResource } from '@openmrs/esm-framework';
import { type FormProcessor } from '../processors/form-processor';
import { type FormContextProps } from '../provider/form-provider';
import { type FormField, type FormSchema } from './schema';
import { type OpenmrsEncounter } from './domain';

export type SessionMode = 'edit' | 'enter' | 'view' | 'embedded-view';

export interface FormProcessorContextProps {
  patient: fhir.Patient;
  formJson: FormSchema;
  visit: OpenmrsResource;
  sessionMode: SessionMode;
  sessionDate: Date;
  location: OpenmrsResource;
  currentProvider: OpenmrsResource;
  layoutType: LayoutType;
  domainObjectValue?: OpenmrsResource;
  previousDomainObjectValue?: OpenmrsResource;
  processor: FormProcessor;
  formFields?: FormField[];
  formFieldAdapters?: Record<string, FormFieldValueAdapter>;
  formFieldValidators?: Record<string, FormFieldValidator>;
  customDependencies?: Record<string, any>;
}

/**
 * Interface for adapting form field values between primitive and composite formats.
 */
export interface FormFieldValueAdapter {
  /**
   * Adapts a field value from its primitive form to a composite form for backend submission.
   */
  transformFieldValue: (field: FormField, value: any, context: FormContextProps) => any;
  /**
   * Extracts the primitive value of a field from an Openmrs object.
   * @param field - The form field whose value is to be extracted.
   * @param sourceObject - The Openmrs object to extract the value from eg. patient, encounter etc.
   */
  getInitialValue: (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ) => Promise<any> | any;
  /**
   * Very similar to `getInitialValue`, but used to extract "previous" values.
   */
  getPreviousValue: (
    field: FormField,
    sourceObject: OpenmrsResource,
    context: FormProcessorContextProps,
  ) => Promise<any> | any;
  /**
   * Extracts the display value from a composite object.
   */
  getDisplayValue: (field: FormField, value: any) => any;
  /**
   * Tears down the adapter.
   */
  tearDown: () => void;
}

/**
 * @deprecated
 * TODO: Remove this interface
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
    context?: any,
  ) => {};

  /**
   * Handles field submission.
   *
   * @should Construct a new submission value, edit and handle deletion by voiding.
   * @returns the `submissionValue`
   */
  handleFieldSubmission: (field: FormField, value: any, context: any) => {};

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

/**
 * Field validator
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

export * from './schema';
export * from './domain';
