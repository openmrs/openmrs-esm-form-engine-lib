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

export interface ValueAndDisplay {
  value: any;
  display: string;
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
  ) => Promise<ValueAndDisplay> | ValueAndDisplay;
  /**
   * Extracts the display value from a composite object.
   */
  getDisplayValue: (field: FormField, value: any) => any;
  /**
   * Tears down the adapter.
   */
  tearDown: () => void;
}

export interface DataSource<T> {
  /**
   * Fetches arbitrary data from a data source
   */
  fetchData(searchTerm?: string, config?: Record<string, any>): Promise<Array<T>>;

  /**
   * Fetches a single item from the data source based on its UUID.
   * This is used for value binding with previously selected values.
   */
  fetchSingleItem(uuid: string): Promise<T | null>;

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
