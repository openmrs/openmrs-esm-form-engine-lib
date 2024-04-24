import React, { useContext, useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { attach, ExtensionSlot } from '@openmrs/esm-framework';
import { FormContext } from '../../form-context';
import { FormFieldProps } from '../../types';

const ExtensionParcel: React.FC<FormFieldProps> = ({ question }) => {
  const { encounterContext, isSubmitting } = useContext(FormContext);
  const submissionNotifier = useMemo(() => new BehaviorSubject<{ isSubmitting: boolean }>({ isSubmitting: false }), []);

  const state = useMemo(
    () => ({ patientUuid: encounterContext.patient.id, submissionNotifier }),
    [encounterContext.patient.id, submissionNotifier],
  );

  useEffect(() => {
    if (question.questionOptions.extensionSlotName && question.questionOptions.extensionId) {
      attach(question.questionOptions.extensionSlotName, question.questionOptions.extensionId);
    }
  }, []);

  useEffect(() => {
    submissionNotifier.next({ isSubmitting: isSubmitting });
  }, [isSubmitting, submissionNotifier]);

  return (
    <>
      {question.questionOptions.extensionSlotName && (
        <ExtensionSlot name={question.questionOptions.extensionSlotName} state={state} />
      )}
    </>
  );
};

export default ExtensionParcel;
