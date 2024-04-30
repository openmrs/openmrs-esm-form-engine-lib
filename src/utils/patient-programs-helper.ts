export const getPatientPrograms = (patient: any, programUuid: Record<string, any>) => {
  const patientPrograms = patient.patientPrograms;
  return patientPrograms.find((program) => program.program.uuid == programUuid);
}