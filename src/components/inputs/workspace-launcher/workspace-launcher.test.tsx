import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { launchWorkspace2, showSnackbar } from '@openmrs/esm-framework';
import { mockPatient, mockVisit } from '__mocks__';
import { useFormProviderContext } from 'src/provider/form-provider';
import { type FormField } from '../../../types';
import WorkspaceLauncher from './workspace-launcher.component';

jest.mock('src/provider/form-provider', () => ({
  useFormProviderContext: jest.fn(),
}));

const mockUseFormProviderContext = useFormProviderContext as jest.Mock;
const mockLaunchWorkspace2 = launchWorkspace2 as jest.Mock;
const mockShowSnackbar = showSnackbar as jest.Mock;

const baseField: FormField = {
  label: 'Add patient allergies',
  type: 'control',
  id: 'launchPatientAllergyWorkspace',
  questionOptions: {
    rendering: 'workspace-launcher',
    workspaceName: 'patient-allergy-form-workspace',
    buttonLabel: 'Add Allergy',
    workspaceProps: { mode: 'enter' },
  },
  isHidden: false,
  isRequired: false,
  isDisabled: false,
};

const defaultProps = {
  field: baseField,
  value: null,
  errors: [],
  warnings: [],
  setFieldValue: jest.fn(),
};

const mockProviderValues = {
  layoutType: 'small-desktop',
  sessionMode: 'enter',
  workspaceLayout: 'minimized',
  formFieldAdapters: {},
  patient: mockPatient,
  methods: undefined,
  visit: mockVisit,
  sessionDate: new Date(),
  location: mockVisit.location,
  currentProvider: undefined,
  processor: { getInitialValues: jest.fn() },
};

const renderWorkspaceLauncher = async (props = defaultProps) => {
  render(<WorkspaceLauncher {...props} />);
};

describe('WorkspaceLauncher', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFormProviderContext.mockReturnValue(mockProviderValues);
  });

  it('renders the field label and button', async () => {
    await renderWorkspaceLauncher();

    expect(screen.getByTestId('launchPatientAllergyWorkspace-label')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add allergy/i })).toBeInTheDocument();
  });

  it('renders the default button label when no custom label is provided', async () => {
    await renderWorkspaceLauncher({
      ...defaultProps,
      field: {
        ...baseField,
        questionOptions: {
          ...baseField.questionOptions,
          buttonLabel: undefined,
        },
      },
    });

    expect(screen.getByRole('button', { name: /launch workspace/i })).toBeInTheDocument();
  });

  it('launches the workspace with correct arguments when clicked', async () => {
    await renderWorkspaceLauncher();

    const button = screen.getByRole('button', { name: /add allergy/i });
    await user.click(button);

    expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
      'patient-allergy-form-workspace',
      { mode: 'enter' },
      {
        patient: mockPatient,
        patientUuid: mockPatient.id,
        visitContext: mockVisit,
      },
    );
  });

  it('shows an error snackbar when workspace name is missing', async () => {
    await renderWorkspaceLauncher({
      ...defaultProps,
      field: {
        ...baseField,
        questionOptions: {
          ...baseField.questionOptions,
          workspaceName: undefined,
        },
      },
    });

    const button = screen.getByRole('button', { name: /add allergy/i });
    await user.click(button);

    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'error',
      }),
    );
    expect(mockLaunchWorkspace2).not.toHaveBeenCalled();
  });

  it('returns null when the field is hidden', async () => {
    const { container } = render(
      <WorkspaceLauncher
        {...defaultProps}
        field={{ ...baseField, isHidden: true }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('returns null in view mode', async () => {
    mockUseFormProviderContext.mockReturnValue({
      ...mockProviderValues,
      sessionMode: 'view',
    });

    const { container } = render(<WorkspaceLauncher {...defaultProps} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('returns null in embedded-view mode', async () => {
    mockUseFormProviderContext.mockReturnValue({
      ...mockProviderValues,
      sessionMode: 'embedded-view',
    });

    const { container } = render(<WorkspaceLauncher {...defaultProps} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('disables the button when the field is readonly', async () => {
    await renderWorkspaceLauncher({
      ...defaultProps,
      field: {
        ...baseField,
        readonly: true,
      },
    });

    expect(screen.getByRole('button', { name: /add allergy/i })).toBeDisabled();
  });

  it('passes empty workspaceProps when none are configured', async () => {
    await renderWorkspaceLauncher({
      ...defaultProps,
      field: {
        ...baseField,
        questionOptions: {
          ...baseField.questionOptions,
          workspaceProps: undefined,
        },
      },
    });

    const button = screen.getByRole('button', { name: /add allergy/i });
    await user.click(button);

    expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
      'patient-allergy-form-workspace',
      {},
      expect.objectContaining({
        patientUuid: mockPatient.id,
      }),
    );
  });
});
