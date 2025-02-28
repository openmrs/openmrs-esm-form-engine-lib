import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDatetime, parseDate, showSnackbar } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { Button } from '@carbon/react';
import { type Appointment, type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import styles from './workspace-launcher.scss';
import { useFormFactory } from '../../../provider/form-factory-provider';
import { DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@carbon/react';
import { InlineNotification } from '@carbon/react';

const WorkspaceLauncher: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();
  const {
    patientAppointments: { addAppointmentForCurrentEncounter },
  } = useFormFactory();
  const launchWorkspace = useLaunchWorkspaceRequiringVisit(field.questionOptions?.workspaceName);

  const handleAfterCreateAppointment = async (appointmentUuid: string) => {
    addAppointmentForCurrentEncounter(appointmentUuid);
  };

  const handleLaunchWorkspace = () => {
    if (!launchWorkspace) {
      showSnackbar({
        title: t('invalidWorkspaceName', 'Invalid workspace name.'),
        subtitle: t('invalidWorkspaceNameSubtitle', 'Please provide a valid workspace name.'),
        kind: 'error',
        isLowContrast: true,
      });
    }
    if (field.meta?.handleAppointmentCreation) {
      launchWorkspace({ handleAfterCreateAppointment });
    } else {
      launchWorkspace();
    }
  };

  return (
    !field.isHidden && (
      <div>
        <div className={styles.label}>{t(field.label)}</div>
        <div className={styles.workspaceButton}>
          <Button disabled={isTrue(field.readonly)} onClick={handleLaunchWorkspace}>
            {t(field.questionOptions?.buttonLabel) ?? t('launchWorkspace', 'Launch Workspace')}
          </Button>
        </div>
        {field.meta?.handleAppointmentCreation && <AppointmentsTable />}
      </div>
    )
  );
};

const AppointmentsTable: React.FC = () => {
  const { t } = useTranslation();
  const {
    patientAppointments: { appointments, errorFetchingAppointments },
  } = useFormFactory();

  const headers = useMemo(
    () => [
      { key: 'startDateTime', header: t('appointmentDatetime', 'Date & time') },
      { key: 'location', header: t('location', 'Location') },
      { key: 'service', header: t('service', 'Service') },
      { key: 'status', header: t('status', 'Status') },
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      appointments.map((appointment) => ({
        id: appointment.uuid,
        startDateTime: formatDatetime(parseDate(appointment.startDateTime), {
          mode: 'standard',
        }),
        location: appointment?.location?.name ? appointment?.location?.name : '——',
        service: appointment.service.name,
        status: appointment.status,
      })),
    [appointments],
  );

  if (errorFetchingAppointments) {
    return (
      <InlineNotification
        kind="error"
        title={t('errorFetchingAppointments', 'Error fetching appointments')}
        subtitle={errorFetchingAppointments?.message}
        lowContrast={false}
      />
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <DataTable rows={rows} headers={headers}>
      {({ rows, headers, getTableProps, getHeaderProps, getRowProps, getCellProps }) => (
        <Table {...getTableProps()}>
          <TableHead>
            <TableRow>
              {headers.map((header) => (
                <TableHeader key={header.key} {...getHeaderProps({ header })}>
                  {header.header}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} {...getRowProps({ row })}>
                {row.cells.map((cell) => (
                  <TableCell key={cell.id} {...getCellProps({ cell })}>
                    {cell.value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataTable>
  );
};

export default WorkspaceLauncher;
