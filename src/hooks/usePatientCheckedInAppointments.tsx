import { openmrsFetch, restBaseUrl } from "@openmrs/esm-framework";
import dayjs from "dayjs";
import useSWR from "swr";
import { type AppointmentsFetchResponse } from "../types";

export const usePatientAppointments = (patientUuid: string, encounterUUID: string) => {
  const abortController = new AbortController();

  const startDate = dayjs(new Date().toISOString()).subtract(6, 'month').toISOString();

  const appointmentsSearchUrl = `${restBaseUrl}/appointments/search`;
  const fetcher = () =>
    openmrsFetch(appointmentsSearchUrl, {
      method: 'POST',
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        patientUuid: patientUuid,
        startDate: startDate,
      },
    });

  const { data, error, isLoading, isValidating, mutate } = useSWR<AppointmentsFetchResponse, Error>(
    appointmentsSearchUrl,
    fetcher,
  );

  const appointments = encounterUUID && data?.data?.length
    ? data.data.filter((appointment) => appointment.fulfillingEncounters.includes(encounterUUID))
    : [];

  return {
    data: data ? appointments : [],
    mutate,
    error,
    isLoading,
    isValidating,
  };
};
