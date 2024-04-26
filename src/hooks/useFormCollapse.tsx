import { SessionMode } from '../types';
import { useEffect, useState } from 'react';

export function useFormCollapse(sessionMode: SessionMode) {
  const [isFormExpanded, setIsFormExpanded] = useState(true);

  useEffect(() => {
    const handleFormCollapseToggle = (event) => {
      setIsFormExpanded(event.detail.value);
    };

    window.addEventListener('openmrs:form-collapse-toggle', handleFormCollapseToggle);

    return () => {
      window.removeEventListener('openmrs:form-collapse-toggle', handleFormCollapseToggle);
    };
  }, []);

  useEffect(() => {
    window.addEventListener('openmrs:form-view-embedded', null);

    return () => {
      window.removeEventListener('openmrs:form-view-embedded', null);
    };
  }, []);

  const hideFormCollapseToggle = () => {
    const HideFormCollapseToggle = new CustomEvent('openmrs:form-view-embedded', { detail: { value: false } });
    window.dispatchEvent(HideFormCollapseToggle);
  };

  useEffect(() => {
    const FormCollapseToggleVisibleEvent = new CustomEvent('openmrs:form-view-embedded', {
      detail: { value: sessionMode != 'embedded-view' },
    });
    window.dispatchEvent(FormCollapseToggleVisibleEvent);
  }, [sessionMode]);

  return {
    isFormExpanded,
    hideFormCollapseToggle,
  };
}
