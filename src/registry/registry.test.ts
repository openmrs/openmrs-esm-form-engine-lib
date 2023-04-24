import { OHRIMultiSelect } from '../components/inputs/multi-select/ohri-multi-select.component';
import OHRINumber from '../components/inputs/number/ohri-number.component';
import { getFieldComponent } from './registry';

describe('registry', () => {
  it('should load the OHRINumber component with alias "numeric"', async () => {
    const result = await getFieldComponent('numeric');
    expect(result).toEqual({ default: OHRINumber });
  });

  it('should load the OHRIMultiSelect component with alias "multiCheckbox"', async () => {
    const result = await getFieldComponent('multiCheckbox');
    expect(result).toEqual({ default: OHRIMultiSelect });
  });

  it('should return undefined if no matching component is found', async () => {
    const result = await getFieldComponent('unknown');
    expect(result).toBeUndefined();
  });
});
