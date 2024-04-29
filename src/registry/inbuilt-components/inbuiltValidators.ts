import { type FormFieldValidator } from '../../types';
import { DateValidator } from '../../validators/date-validator';
import { DefaultFieldValueValidator } from '../../validators/default-value-validator';
import { ExpressionValidator } from '../../validators/js-expression-validator';
import { type RegistryItem } from '../registry';

/**
 * @internal
 */
export const inbuiltValidators: Array<RegistryItem<FormFieldValidator>> = [
  {
    name: 'default',
    component: DefaultFieldValueValidator,
  },
  {
    name: 'date',
    component: DateValidator,
  },
  {
    name: 'js_expression',
    component: ExpressionValidator,
  },
];
