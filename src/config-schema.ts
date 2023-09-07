import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  dataTypeToRenderingMap: {
    _description: 'A map used to match concept datatypes to rendering types',
    _type: Type.Object,
    _default: {
      Numeric: ['number', 'fixed-value'],
      Coded: ['select', 'checkbox', 'radio', 'toggle', 'content-switcher', 'fixed-value'],
      Text: ['text', 'textarea', 'fixed-value'],
      Date: ['date', 'fixed-value'],
      Datetime: ['datetime', 'fixed-value'],
      Boolean: ['toggle', 'select', 'radio', 'content-switcher', 'fixed-value'],
      Rule: ['repeating', 'group'],
    },
  },

  conceptDataTypes: {
    _description: 'An object containing availabe datatypes',
    _type: Type.Object,
    _default: {
      Numeric: 'Numeric',
      Coded: 'Coded',
      Text: 'Text',
      Date: 'Date',
      Datetime: 'Datetime',
      Boolean: 'Boolean',
      Rule: 'Rule',
    },
  },
};
