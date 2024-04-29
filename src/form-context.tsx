import React from 'react';
import { type LayoutType } from '@openmrs/esm-framework';
import {
  type FormField,
  type OpenmrsEncounter,
  type PatientIdentifier,
  type SessionMode,
  type SubmissionHandler,
} from './types';

type FormContextProps = {
  values: Record<string, any>;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  setEncounterLocation: (value: any) => void;
  obsGroupsToVoid: Array<any>;
  setObsGroupsToVoid: (value: any) => void;
  encounterContext: EncounterContext;
  fields: FormField[];
  isFieldInitializationComplete: boolean;
  isSubmitting: boolean;
  layoutType?: LayoutType;
  workspaceLayout?: 'minimized' | 'maximized';
  formFieldHandlers: Record<string, SubmissionHandler>;
};

export interface EncounterContext {
  patient: fhir.Patient;
  encounter: OpenmrsEncounter;
  previousEncounter?: OpenmrsEncounter;
  location: any;
  sessionMode: SessionMode;
  encounterDate: Date;
  setEncounterDate(value: Date): void;
  encounterProvider: string;
  setEncounterProvider(value: string): void;
  setEncounterLocation(value: any): void;
  initValues?: Record<string, any>;
  setObsGroupCounter?: any;
  patientIdentifier?: PatientIdentifier;
}

export const FormContext = React.createContext<FormContextProps | undefined>(undefined);
