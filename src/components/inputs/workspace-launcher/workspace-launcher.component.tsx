import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDatetime, parseDate, showSnackbar } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { Button } from '@carbon/react';
import { type Appointment, type FormFieldInputProps } from '../../../types';
import { isTrue } from '../../../utils/boolean-utils';
import styles from './workspace-launcher.scss';
import { useFormFactory } from '../../../provider/form-factory-provider';
import { getPatientAppointment } from '../../../api';
import { DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@carbon/react';

const WorkspaceLauncher: React.FC<FormFieldInputProps> = ({ field }) => {
  const { t } = useTranslation();
  const { appointments, setAppointments } = useFormFactory();
  const launchWorkspace = useLaunchWorkspaceRequiringVisit(field.questionOptions?.workspaceName);

  const handleAfterCreateAppointment = async (appointmentUuid: string) => {
    const appointment: Appointment = await getPatientAppointment(appointmentUuid);
    setAppointments((prevAppointments: Array<Appointment>) => [...prevAppointments, appointment]);
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
    field.questionOptions?.workspaceName === 'appointments-form-workspace' ? launchWorkspace({handleAfterCreateAppointment}) : launchWorkspace();
  };

  const AppointmentsTable = ({ appointments }) => {
    const headers = [
      { key: 'startDateTime', header: 'Date & Time' },
      { key: 'location', header: 'Location' },
      { key: 'service', header: 'Service' },
      { key: 'status', header: 'Status' },
    ];
  
    const rows = appointments.map((appointment) => ({
      id: `${appointment.uuid}`,
      startDateTime: formatDatetime(parseDate(appointment.startDateTime)),
      location: appointment?.location?.name ? appointment?.location?.name : '——',
      service: appointment.service.name,
      status: appointment.status,
    }));
  
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

  return (
    !field.isHidden && (
      <div>
        <div className={styles.label}>{t(field.label)}</div>
        <div className={styles.workspaceButton}>
          <Button disabled={isTrue(field.readonly)} onClick={handleLaunchWorkspace}>
            {t(field.questionOptions?.buttonLabel) ?? t('launchWorkspace', 'Launch Workspace')}
          </Button>
        </div>
        {appointments.length !== 0 && (
          <div>
            <AppointmentsTable appointments={appointments} />
          </div>
        )}
      </div>
    )
  );
};

export default WorkspaceLauncher;
