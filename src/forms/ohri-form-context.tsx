import React from 'react';
import { SessionMode } from './types';

type OHRIFormContextProps = {
  values: Record<string, any>;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  setEncounterLocation: (value: any) => void;
  obsGroupsToVoid: Array<any>;
  setObsGroupsToVoid: (value: any) => void;
  encounterContext: EncounterContext;
  fields: any;
};

export interface EncounterContext {
  patient: any;
  encounter: any;
  location: any;
  sessionMode: SessionMode;
  date: Date;
}

export const OHRIFormContext = React.createContext<OHRIFormContextProps | undefined>(undefined);
