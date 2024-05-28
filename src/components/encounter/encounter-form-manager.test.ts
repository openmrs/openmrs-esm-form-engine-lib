import { type PatientProgram, type FormField } from '../../types';
import { EncounterFormManager } from './encounter-form-manager';

describe('EncounterFormManager', () => {
  describe('preparePatientPrograms', () => {
    const fields: FormField[] = [
      {
        label: 'State 1',
        type: 'programState',
        questionOptions: { rendering: 'select', programUuid: 'program-1-uuid' },
        meta: { submission: { newValue: { state: 'state-1' } } },
        id: 'state_1',
      },
      {
        label: 'State 2',
        type: 'programState',
        questionOptions: { rendering: 'select', programUuid: 'program-1-uuid' },
        meta: { submission: { newValue: { state: 'state-2' } } },
        id: 'state_2',
      },
      {
        label: 'State 3',
        type: 'programState',
        questionOptions: { rendering: 'select', programUuid: 'program-2-uuid' },
        meta: { submission: { newValue: { state: 'state-3' } } },
        id: 'state_3',
      },
    ];

    it('should group program states by program', () => {
      const patient = { id: 'patient-1' } as fhir.Patient;
      const currentPatientPrograms = [
        {
          program: {
            uuid: 'program-1-uuid',
          },
          uuid: 'existing-enrollment-1-uuid',
        },
        {
          program: {
            uuid: 'program-2-uuid',
          },
          uuid: 'existing-enrollment-2-uuid',
        },
      ] as Array<PatientProgram>;

      const result = EncounterFormManager.preparePatientPrograms(fields, patient, currentPatientPrograms);
      expect(result).toEqual([
        {
          uuid: 'existing-enrollment-1-uuid',
          states: [{ state: 'state-1' }, { state: 'state-2' }],
        },
        {
          uuid: 'existing-enrollment-2-uuid',
          states: [{ state: 'state-3' }],
        },
      ]);
    });

    it('should enroll in a new program if none exists', () => {
      const patient = { id: 'patient-1' } as fhir.Patient;
      const result = EncounterFormManager.preparePatientPrograms([fields[0]], patient, []);
      expect(result).toEqual([
        {
          patient: 'patient-1',
          program: 'program-1-uuid',
          states: [{ state: 'state-1' }],
          dateEnrolled: expect.any(String),
        },
      ]);
    });
  });
});
