import { FieldValidator } from '../..';
import { OHRIDateValidator } from '../../validators/ohri-date-validator';
import { OHRIFieldValidator } from '../../validators/ohri-form-validator';
import { OHRIJSExpressionValidator } from '../../validators/ohri-js-expression-validator';
import { RegistryItem } from '../registry';

/**
 * @internal
 */
export const inbuiltValidators: Array<RegistryItem<FieldValidator>> = [
  {
    name: 'default',
    component: OHRIFieldValidator,
  },
  {
    name: 'date',
    component: OHRIDateValidator,
  },
  {
    name: 'js_expression',
    component: OHRIJSExpressionValidator,
  },
];
