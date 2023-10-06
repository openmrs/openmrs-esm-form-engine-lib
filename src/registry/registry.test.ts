import { OHRIMultiSelect } from '../components/inputs/multi-select/ohri-multi-select.component';
import OHRINumber from '../components/inputs/number/ohri-number.component';
import { getRegisteredControl } from './registry';

describe('registry', () => {
  it('should load the OHRINumber component with alias "numeric"', async () => {
    const result = await getRegisteredControl('numeric');
    expect(result).toEqual(OHRINumber);
  });

  it('should load the OHRIMultiSelect component with alias "multiCheckbox"', async () => {
    const result = await getRegisteredControl('multiCheckbox');
    expect(result).toEqual(OHRIMultiSelect);
  });

  it('should return undefined if no matching component is found', async () => {
    const result = await getRegisteredControl('unknown');
    expect(result).toBeUndefined();
  });
});
