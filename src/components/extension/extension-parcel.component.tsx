import React, { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { attach, ExtensionSlot } from '@openmrs/esm-framework';
import { type FormFieldInputProps } from '../../types';
import { useFormProviderContext } from '../../provider/form-provider';

const ExtensionParcel: React.FC<FormFieldInputProps> = ({ field }) => {
  const submissionNotifier = useMemo(() => new BehaviorSubject<{ isSubmitting: boolean }>({ isSubmitting: false }), []);
  const { isSubmitting, patient } = useFormProviderContext();

  const state = useMemo(() => ({ patientUuid: patient.id, submissionNotifier }), [patient.id, submissionNotifier]);

  useEffect(() => {
    if (field.questionOptions.extensionSlotName && field.questionOptions.extensionId) {
      attach(field.questionOptions.extensionSlotName, field.questionOptions.extensionId);
    }
  }, []);

  useEffect(() => {
    submissionNotifier.next({ isSubmitting: isSubmitting });
  }, [isSubmitting, submissionNotifier]);

  return (
    <>
      {field.questionOptions.extensionSlotName && (
        <ExtensionSlot name={field.questionOptions.extensionSlotName} state={state} />
      )}
    </>
  );
};

export default ExtensionParcel;
