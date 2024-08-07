import { getRegisteredControl } from './registry';
import MultiSelect from '../components/inputs/multi-select/multi-select.component';
import Number from '../components/inputs/number/number.component';

describe.skip('registry', () => {
  it('should load the NumberField component with alias "numeric"', async () => {
    const result = await getRegisteredControl('numeric');
    expect(result).toEqual(Number);
  });

  it('should load the MultiSelect component with alias "multiCheckbox"', async () => {
    const result = await getRegisteredControl('multiCheckbox');
    expect(result).toEqual(MultiSelect);
  });

  it('should return undefined if no matching component is found', async () => {
    const result = await getRegisteredControl('unknown');
    expect(result).toBeUndefined();
  });
});
