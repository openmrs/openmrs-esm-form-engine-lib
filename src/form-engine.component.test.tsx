import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { mockPatient, mockSessionDataResponse, mockVisit } from '__mocks__';
import FormEngine from './form-engine.component';

jest.mock('./hooks/useFormWorkspaceSize', () => ({
  useFormWorkspaceSize: jest.fn().mockReturnValue('wider'),
}));

jest.mock('./components/sidebar/usePageObserver', () => ({
  usePageObserver: jest.fn().mockReturnValue({
    pages: [{ id: 'p1' }, { id: 'p2' }],
    pagesWithErrors: [],
    activePages: [],
    evaluatedPagesVisibility: false,
    hasMultiplePages: true,
  }),
}));

jest.mock('./hooks/useFormCollapse', () => ({
  useFormCollapse: jest.fn().mockReturnValue({
    isFormExpanded: true,
    hideFormCollapseToggle: jest.fn(),
  }),
}));

jest.mock('./hooks/usePatientData', () => ({
  usePatientData: jest.fn().mockReturnValue({
    patient: { id: 'test-patient' },
    isLoadingPatient: false,
  }),
}));

jest.mock('./hooks/useFormJson', () => ({
  useFormJson: jest.fn().mockReturnValue({
    formJson: {
      name: 'multi-section-test-form',
      pages: [
        { label: 'Page 1', sections: [] },
        { label: 'Page 2', sections: [] },
      ],
    },
    isLoading: false,
    formError: null,
  }),
}));

jest.mock('./lifecycle', () => ({
  init: jest.fn(),
  teardown: jest.fn(),
}));

jest.mock('./components/processor-factory/form-processor-factory.component', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./components/sidebar/sidebar.component', () => ({
  __esModule: true,
  default: () => <div data-testid="form-sidebar">sidebar</div>,
}));

jest.mock('./components/patient-banner/patient-banner.component', () => ({
  __esModule: true,
  default: () => null,
}));

const mockUsePatient = jest.mocked(usePatient);
const mockUseSession = jest.mocked(useSession);

describe('FormEngine sidebar visibility', () => {
  beforeEach(() => {
    mockUsePatient.mockReturnValue({
      patient: mockPatient,
      isLoading: false,
      error: undefined,
      patientUuid: mockPatient.id,
    });
    mockUseSession.mockReturnValue(mockSessionDataResponse.data);
  });

  it('hides sidebar and shows bottom button set on wider workspaces for multi-section forms', () => {
    render(
      <FormEngine
        patientUUID="8673ee4f-e2ab-4077-ba55-4980f408773e"
        visit={mockVisit}
        mode="enter"
      />,
    );

    expect(screen.queryByTestId('form-sidebar')).not.toBeInTheDocument();

    const buttonSet = document.querySelector('.minifiedButtons');
    expect(buttonSet).toBeInTheDocument();
    expect(within(buttonSet as HTMLElement).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(within(buttonSet as HTMLElement).getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
