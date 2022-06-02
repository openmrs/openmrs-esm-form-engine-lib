import React, { useEffect, useMemo } from 'react';
import { OHRIFormFieldProps } from '../../api/types';
import { attach, ExtensionSlot } from '@openmrs/esm-framework';
import { OHRIFormContext } from '../../ohri-form-context';

const OHRIExtensionParcel: React.FC<OHRIFormFieldProps> = ({ question }) => {
  const { encounterContext, isSubmitting } = React.useContext(OHRIFormContext);

  const state = useMemo(() => ({ patientUuid: encounterContext.patient.id, isSubmitting }), [
    isSubmitting,
    encounterContext.patient.id,
  ]);

  useEffect(() => {
    if (question.questionOptions.extensionSlotName && question.questionOptions.extensionId) {
      attach(question.questionOptions.extensionSlotName, question.questionOptions.extensionId);
    }
  }, []);

  return (
    <>
      {question.questionOptions.extensionSlotName && (
        <ExtensionSlot extensionSlotName={question.questionOptions.extensionSlotName} state={state} />
      )}
    </>
  );
};

export default OHRIExtensionParcel;
