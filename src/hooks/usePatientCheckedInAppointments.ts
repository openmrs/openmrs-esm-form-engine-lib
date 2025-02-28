import { openmrsFetch, restBaseUrl, useOpenmrsSWR } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import useSWR, { mutate, SWRResponse } from 'swr';
import { type AppointmentsResponse } from '../types';
import { useCallback, useMemo, useState } from 'react';

export function usePatientAppointments(patientUuid: string, encounterUUID: string) {
  const [appointmentUuids, setAppointmentUuids] = useState<Array<string>>([]);

  const startDate = useMemo(() => dayjs().subtract(6, 'month').toISOString(), []);

  // We need to fetch the appointments with the specified fulfilling encounter
  const appointmentsSearchUrl =
    encounterUUID || appointmentUuids.length > 0 ? `${restBaseUrl}/appointments/search` : null;

  const swrResult = useOpenmrsSWR<AppointmentsResponse, Error>(appointmentsSearchUrl, {
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
      setAppointmentUuids((prev) => (!prev.includes(appointmentUuid) ? [...prev, appointmentUuid] : prev));
      swrResult.mutate();
    },
    [swrResult.mutate, setAppointmentUuids],
  );

  const results = useMemo(
    () => ({
      appointments: (swrResult.data?.data ?? [])?.filter(
        (appointment) =>
          appointment.fulfillingEncounters?.includes(encounterUUID) || appointmentUuids.includes(appointment.uuid),
      ),
      mutateAppointments: swrResult.mutate,
      isLoading: swrResult.isLoading,
      error: swrResult.error,
      addAppointmentForCurrentEncounter,
    }),
    [swrResult, addAppointmentForCurrentEncounter, appointmentUuids, encounterUUID],
  );

  return results;
}
