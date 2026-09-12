import React from 'react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, act } from '@testing-library/react';
import { showModal } from '@openmrs/esm-framework';
import { useFormProviderContext } from 'src/provider/form-provider';
import { mockPatient } from '__mocks__/patient.mock';
import { mockVisit } from '__mocks__/visit.mock';
import { sampleFieldsForm } from '__mocks__/forms';
import { type Attachment } from '../../../types';
import File from './file.component';

const mockShowModal = vi.mocked(showModal);
const mockSetFieldValue = vi.fn();

vi.mock('src/provider/form-provider', () => ({
  useFormProviderContext: vi.fn(),
}));

const mockUseFormProviderContext = useFormProviderContext as Mock;

const imageAttachment = (fileName: string, overrides: Partial<Attachment> = {}): Attachment => ({
  base64Content: `data:image/jpeg;base64,${fileName}`,
  fileName,
  fileType: 'image',
  fileDescription: '',
  ...overrides,
});

const fileField = {
  label: 'Attach a scan',
  type: 'obs',
  required: false,
  id: 'attachScan',
  questionOptions: {
    rendering: 'file',
    concept: '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    answers: [],
  },
  meta: {
    submission: {
      newValue: null,
    },
    concept: {
      uuid: '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      display: 'Complex obs',
      answers: [],
      conceptMappings: [],
    },
  },
  validators: [],
  isHidden: false,
  isRequired: false,
  isDisabled: false,
};

const fileValues = {
  field: fileField,
  value: null,
  errors: [],
  warnings: [],
  setFieldValue: mockSetFieldValue,
};

const mockProviderValues = {
  layoutType: 'small-desktop',
  sessionMode: 'enter',
  workspaceLayout: 'minimized',
  formFieldAdapters: {},
  patient: mockPatient,
  methods: undefined,
  formJson: sampleFieldsForm,
  visit: mockVisit,
  sessionDate: new Date(),
  location: mockVisit.location,
  currentProvider: mockVisit.encounters[0]?.encounterProvider,
  processor: undefined,
};

const renderFileField = async (props, sessionMode = 'enter') => {
  mockUseFormProviderContext.mockReturnValue({
    ...mockProviderValues,
    sessionMode,
    setFieldValue: mockSetFieldValue,
  });
  await act(() => render(<File {...props} />));
};

describe('File field input', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseFormProviderContext.mockReturnValue({
      ...mockProviderValues,
      setFieldValue: mockSetFieldValue,
    });
  });

  // The other half of this contract - that the voided entry stays in the field value, because
  // obs-adapter reads it back at submission - is asserted by the voiding test at the bottom.
  it('should keep a voided attachment off the screen', async () => {
    await renderFileField({
      ...fileValues,
      value: [
        imageAttachment('first.jpg'),
        imageAttachment('voided.jpg', { uuid: 'abc-123', voided: true }),
        imageAttachment('third.jpg'),
      ],
    });

    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.queryByRole('img', { name: 'voided.jpg' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'first.jpg' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'third.jpg' })).toBeInTheDocument();
  });

  it('should show each attachment filename and keep the full name reachable when it is clipped', async () => {
    const fileNames = ['first.jpg', 'a-considerably-longer-file-name.jpg', 'third.jpg'];
    await renderFileField({ ...fileValues, value: fileNames.map((fileName) => imageAttachment(fileName)) });

    for (const fileName of fileNames) {
      // The caption is only as wide as the tile and shares that with the remove control, so the
      // stylesheet clips the name with an ellipsis. `title` is what keeps the rest of it reachable;
      // jsdom does no layout, so the clipping itself is a manual check.
      expect(screen.getByText(fileName)).toHaveAttribute('title', fileName);
    }
  });

  it('should not offer to add files in view mode', async () => {
    await renderFileField({ ...fileValues, value: [imageAttachment('first.jpg')] }, 'view');
    expect(screen.queryByRole('button', { name: /add file/i })).not.toBeInTheDocument();
  });

  it('should offer to add files when entering an encounter', async () => {
    await renderFileField({ ...fileValues, value: [imageAttachment('first.jpg')] }, 'enter');
    expect(screen.getByRole('button', { name: /add file/i })).toBeInTheDocument();
  });

  it("should hand the field's own options to the capture modal", async () => {
    await renderFileField({
      ...fileValues,
      field: {
        ...fileField,
        questionOptions: {
          ...fileField.questionOptions,
          allowedFileTypes: ['image/png'],
          allowMultiple: true,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: /add file/i }));

    expect(mockShowModal).toHaveBeenCalledWith(
      'capture-photo-modal',
      expect.objectContaining({
        allowedExtensions: ['image/png'],
        multipleFiles: true,
        collectDescription: true,
      }),
    );
  });

  it('should drop a newly added attachment from the value when it is removed', async () => {
    const first = imageAttachment('first.jpg');
    const second = imageAttachment('second.jpg');
    await renderFileField({ ...fileValues, value: [first, second] });

    await user.click(screen.getAllByRole('button', { name: 'Remove attachment' })[1]);

    expect(mockSetFieldValue).toHaveBeenCalledWith([first]);
  });

  it('should void a saved attachment rather than drop it when it is removed', async () => {
    const saved = imageAttachment('saved.jpg', { uuid: 'abc-123' });
    await renderFileField({ ...fileValues, value: [saved] });

    await user.click(screen.getByRole('button', { name: 'Remove attachment' }));

    expect(mockSetFieldValue).toHaveBeenCalledWith([{ ...saved, voided: true }]);
  });
});
