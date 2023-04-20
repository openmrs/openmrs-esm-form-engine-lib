import { getFieldComponent } from './registry';

jest.mock('./registry', () => ({
  getFieldComponent: jest.fn().mockImplementation(renderType => {
    if (renderType == 'number' || renderType == 'numeric') return 'OHRINumber';
    if (renderType == 'checkbox' || renderType == 'multiCheckbox') return 'OHRIMultiSelect';
  }),
}));

describe('registry', () => {
  it('returns OHRINumber component for "number" or "numeric" render type', () => {
    expect(getFieldComponent('number')).toBe('OHRINumber');
    expect(getFieldComponent('numeric')).toBe('OHRINumber');
  });
  it('returns OHRIMultiSelect component for "checkbox" or "multiCheckbox" render type', () => {
    expect(getFieldComponent('checkbox')).toBe('OHRIMultiSelect');
    expect(getFieldComponent('multiCheckbox')).toBe('OHRIMultiSelect');
  });
});
