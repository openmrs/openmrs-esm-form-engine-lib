import { type OpenmrsResource } from '@openmrs/esm-framework';

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
  concept?: any;
  obsDatetime?: string | Date;
  obsGroup?: OpenmrsObs;
  groupMembers?: Array<OpenmrsObs>;
  comment?: string;
  location?: OpenmrsResource;
  order?: OpenmrsResource;
  encounter?: OpenmrsResource;
  voided?: boolean;
  value?: any;
  formFieldPath?: string;
  formFieldNamespace?: string;
  status?: string;
  interpretation?: string;
}

export interface FHIRObsResource {
  resourceType: string;
  id: string;
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      code: string;
      display: string;
    }>;
    text: string;
  };
  encounter?: {
    reference: string;
    type: string;
  };
  effectiveDateTime: string;
  issued: string;
  valueBoolean?: boolean;
  valueString?: string;
  valueDateTime?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  valueCodeableConcept?: {
    coding: [
      {
        code: string;
        display: string;
      },
    ];
    text: string;
  };
  referenceRange: Array<{
    low?: {
      value: number;
    };
    high?: {
      value: number;
    };
    type: {
      coding: Array<{
        system: string;
        code: string;
      }>;
    };
  }>;
  hasMember?: Array<{
    reference: string;
  }>;
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

export interface Attachment {
  id: string;
  src: string;
  title: string;
  description: string;
  dateTime: string;
  bytesMimeType: string;
  bytesContentFamily: string;
}

export interface AttachmentResponse {
  bytesContentFamily: string;
  bytesMimeType: string;
  comment: string;
  dateTime: string;
  uuid: string;
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

export interface ProgramsFetchResponse {
  results: Array<PatientProgram>;
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

export interface PatientIdentifier {
  uuid?: string;
  identifier: string;
  identifierType?: string;
  location?: string;
  preferred?: boolean;
}
