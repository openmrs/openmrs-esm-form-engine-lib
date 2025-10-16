import { useCallback, useEffect, useState } from 'react';
import type { FormExpanded, SessionMode } from '../types';

export function useFormCollapse(sessionMode: SessionMode) {
  const [isFormExpanded, setIsFormExpanded] = useState<FormExpanded>(undefined);

  const hideFormCollapseToggle = useCallback(() => {
    const HideFormCollapseToggle = new CustomEvent('openmrs:form-view-embedded', { detail: { value: false } });
    window.dispatchEvent(HideFormCollapseToggle);
  }, []);

  const handleFormCollapseToggle = useCallback((event) => {
    setIsFormExpanded(event.detail.value);
  }, []);

  useEffect(() => {
    const FormCollapseToggleVisibleEvent = new CustomEvent('openmrs:form-view-embedded', {
      detail: { value: sessionMode != 'embedded-view' },
    });

    window.dispatchEvent(FormCollapseToggleVisibleEvent);
  }, [sessionMode]);

  useEffect(() => {
    window.addEventListener('openmrs:form-collapse-toggle', handleFormCollapseToggle);

    return () => {
      window.removeEventListener('openmrs:form-collapse-toggle', handleFormCollapseToggle);
    };
  }, []);

  return {
    isFormExpanded,
    hideFormCollapseToggle,
  };
}
