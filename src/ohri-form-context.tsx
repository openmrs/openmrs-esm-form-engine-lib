import { LayoutType } from '@openmrs/esm-framework';
import React from 'react';
import { RepeatObsGroupCounter, OHRIFormField, OpenmrsEncounter, SessionMode, SubmissionHandler } from './api/types';

type OHRIFormContextProps = {
  values: Record<string, any>;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  setEncounterLocation: (value: any) => void;
  obsGroupsToVoid: Array<any>;
  setObsGroupsToVoid: (value: any) => void;
  encounterContext: EncounterContext;
  fields: OHRIFormField[];
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
}

export const OHRIFormContext = React.createContext<OHRIFormContextProps | undefined>(undefined);
