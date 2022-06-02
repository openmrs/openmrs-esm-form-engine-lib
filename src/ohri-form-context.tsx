import { LayoutType } from '@openmrs/esm-framework';
import React from 'react';
import { OHRIFormField, SessionMode } from './api/types';

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
};

export interface EncounterContext {
  patient: any;
  encounter: any;
  previousEncounter?: any;
  location: any;
  sessionMode: SessionMode;
  date: Date;
}

export const OHRIFormContext = React.createContext<OHRIFormContextProps | undefined>(undefined);
