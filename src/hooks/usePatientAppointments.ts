import { restBaseUrl, useOpenmrsSWR } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import type { Appointment, AppointmentsResponse } from '../types';
import { useCallback, useMemo, useState } from 'react';

export interface UsePatientAppointmentsResults {
  /**
   * All the appointments for the patient and encounter, including the newly created appointments
   */
  appointments: Array<Appointment>;
  /**
   * The newly created appointments that doesn't have fulfilling encounters yet
   */
  newlyCreatedAppointments: Array<Appointment>;
  isLoadingAppointments: boolean;
  errorFetchingAppointments: Error;
  isValidatingAppointments: boolean;
  /**
   * When new appointments are created, they need to be added to the list of newly created appointments
   * @param appointmentUuid The UUID of the appointment to add
   */
  addAppointmentForCurrentEncounter: (appointmentUuid: string) => void;
}

/**
 * Returns the appointments for the specified patient and encounter.
 *
 * This hook filters the appointments either the specified encounter UUID,
 * or the newly created appointments that doesn't have fulfilling encounters yet
 * @param patientUuid The UUID of the patient
 * @param encounterUUID The encounter UUID to filter the appointments by their fulfilling encounters
 */
export function usePatientAppointments(patientUuid: string, encounterUUID: string): UsePatientAppointmentsResults {
  const [newlyCreatedAppointmentUuids, setNewlyCreatedAppointmentUuids] = useState<Array<string>>([]);

  const startDate = useMemo(() => dayjs().subtract(6, 'month').toISOString(), []);

  // We need to fetch the appointments with the specified fulfilling encounter
  const appointmentsSearchUrl =
    encounterUUID || newlyCreatedAppointmentUuids.length > 0 ? `${restBaseUrl}/appointments/search` : null;

  const {
    data,
    isLoading: isLoadingAppointments,
    error: errorFetchingAppointments,
    isValidating: isValidatingAppointments,
    mutate: refetchAppointments,
  } = useOpenmrsSWR<AppointmentsResponse, Error>(appointmentsSearchUrl, {
    fetchInit: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        patientUuid: patientUuid,
        startDate: startDate,
      },
    },
  });

  const addAppointmentForCurrentEncounter = useCallback(
    (appointmentUuid: string) => {
      setNewlyCreatedAppointmentUuids((prev) => (!prev.includes(appointmentUuid) ? [...prev, appointmentUuid] : prev));
      refetchAppointments();
    },
    [refetchAppointments, setNewlyCreatedAppointmentUuids],
  );

  const results = useMemo(() => {
    const appointmentsWithEncounter = [];
    const newlyCreatedAppointments = [];

    (data?.data ?? [])?.forEach((appointment) => {
      if (appointment.fulfillingEncounters?.includes(encounterUUID)) {
        appointmentsWithEncounter.push(appointment);
      } else if (newlyCreatedAppointmentUuids.includes(appointment.uuid)) {
        newlyCreatedAppointments.push(appointment);
      }
    });

    return {
      appointments: [...newlyCreatedAppointments, ...appointmentsWithEncounter],
      newlyCreatedAppointments,
      isLoadingAppointments,
      errorFetchingAppointments,
      isValidatingAppointments,
      addAppointmentForCurrentEncounter,
    };
  }, [
    addAppointmentForCurrentEncounter,
    data,
    encounterUUID,
    errorFetchingAppointments,
    isLoadingAppointments,
    isValidatingAppointments,
    newlyCreatedAppointmentUuids,
  ]);

  return results;
}
