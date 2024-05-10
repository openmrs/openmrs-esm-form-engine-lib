import { savePatientIdentifier } from '../api/api';
import { type PatientIdentifier } from '../types';

export const saveIdentifier = (patient: fhir.Patient, patientIdentifier: PatientIdentifier) => {
  const identifier = getPatientLatestIdentifier(patient, patientIdentifier.identifierType);
  if (identifier) {
    patientIdentifier.uuid = identifier.id;
  }

  return savePatientIdentifier(patientIdentifier, patient.id);
};

export const getPatientLatestIdentifier = (patient: fhir.Patient, identifierType: string) => {
  return patient?.identifier?.find((identifier) => {
    if (identifier.type.coding && identifier.type.coding[0].code === identifierType) {
      return true;
    }
    return false;
  });
};
