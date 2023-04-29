import React, { useContext, useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { attach, ExtensionSlot } from '@openmrs/esm-framework';
import { OHRIFormContext } from '../../ohri-form-context';
import { OHRIFormFieldProps } from '../../api/types';

const OHRIExtensionParcel: React.FC<OHRIFormFieldProps> = ({ question }) => {
  const { encounterContext, isSubmitting } = useContext(OHRIFormContext);
  const submissionNotifier = useMemo(
    () => new BehaviorSubject<{ isSubmitting: boolean }>({ isSubmitting: false }),
    [],
  );

  const state = useMemo(() => ({ patientUuid: encounterContext.patient.id, submissionNotifier }), [
    encounterContext.patient.id,
    submissionNotifier,
  ]);

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
        <ExtensionSlot extensionSlotName={question.questionOptions.extensionSlotName} state={state} />
      )}
    </>
  );
};

export default OHRIExtensionParcel;
