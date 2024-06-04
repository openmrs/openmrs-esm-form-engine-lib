import { conditionalAnsweredValidator } from '../../validators/conditional-answered-validator';
import { type FormFieldValidator } from '../../types';
import { DateValidator } from '../../validators/date-validator';
import { DefaultValueValidator } from '../../validators/default-value-validator';
import { FieldValidator } from '../../validators/form-validator';
import { ExpressionValidator } from '../../validators/js-expression-validator';
import { type RegistryItem } from '../registry';

/**
 * @internal
 */
export const inbuiltValidators: Array<RegistryItem<FormFieldValidator>> = [
  {
    name: 'default_value',
    component: DefaultValueValidator,
  },
  {
    name: 'form_field',
    component: FieldValidator,
  },
  {
    name: 'date',
    component: DateValidator,
  },
  {
    name: 'js_expression',
    component: ExpressionValidator,
  },
  {
    name: 'conditionalAnswered',
    component: conditionalAnsweredValidator,
  },
];
