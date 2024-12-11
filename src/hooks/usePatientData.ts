import { usePatient } from '@openmrs/esm-framework';

function calculateAge(birthDate: Date): number {
  const today = new Date();
  const yearsDiff = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) {
    // subtract one year if the current date is before the birth date this year
    return yearsDiff - 1;
  } else {
    return yearsDiff;
  }
}

const patientGenderMap = {
  female: 'F',
  male: 'M',
  other: 'O',
  unknown: 'U',
};

export const usePatientData = (patientUuid) => {
  const { patient, isLoading: isLoadingPatient, error: patientError } = usePatient(patientUuid);
  if (patient && !isLoadingPatient) {
    // This is for backward compatibility with the Angular form engine
    patient['age'] = calculateAge(new Date(patient?.birthDate));
    patient['sex'] = patientGenderMap[patient.gender] ?? 'U';
  }
  return { patient, isLoadingPatient, patientError };
};
