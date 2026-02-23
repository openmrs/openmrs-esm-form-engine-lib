import { PersonAttributeAdapter } from './person-attribute-adapter';
import { type FormField, type FormProcessorContextProps } from '../types';
import { type FormContextProps } from '../provider/form-provider';

describe('PersonAttributeAdapter', () => {
  const mockField = {
    id: 'test-person-attribute',
    type: 'personAttribute',
    questionOptions: {
      attributeType: '7ef225db-94db-4e40-9dd8-fb121d9dc370',
      rendering: 'text',
    },
    meta: {},
  } satisfies FormField;

  const mockContext = {
    patient: {
      id: 'test-patient-uuid',
    } as fhir.Patient,
  } satisfies Partial<FormContextProps> as FormContextProps;

  describe('transformFieldValue', () => {
    it('should return null for empty value', () => {
      const result = PersonAttributeAdapter.transformFieldValue(mockField, '', mockContext);
      expect(result).toBeNull();
    });

    it('should return null when value equals initial value', () => {
      const field = {
        ...mockField,
        meta: {
          submission: {},
          initialValue: {
            omrsObject: null,
            refinedValue: 'test-value',
          },
        },
      } satisfies FormField;
      const result = PersonAttributeAdapter.transformFieldValue(field, 'test-value', mockContext);
      expect(result).toBeNull();
    });

    it('should transform field value correctly for new attribute', () => {
      const field = { ...mockField };
      const result = PersonAttributeAdapter.transformFieldValue(field, 'new-attribute-value', mockContext);

      expect(result).toEqual({
        value: 'new-attribute-value',
        attributeType: '7ef225db-94db-4e40-9dd8-fb121d9dc370',
        uuid: undefined,
      });
    });

    it('should include uuid when updating existing attribute', () => {
      const field = {
        ...mockField,
        meta: {
          submission: {},
          initialValue: {
            omrsObject: { uuid: 'existing-attr-uuid' },
            refinedValue: 'old-value',
          },
        },
      } satisfies FormField;
      const result = PersonAttributeAdapter.transformFieldValue(field, 'updated-value', mockContext);

      expect(result).toEqual({
        value: 'updated-value',
        attributeType: '7ef225db-94db-4e40-9dd8-fb121d9dc370',
        uuid: 'existing-attr-uuid',
      });
    });
  });

  describe('getInitialValue', () => {
    it('should return undefined when no person attribute exists', () => {
      const mockProcessorContext = {
        patient: {
          id: 'test-patient',
          extension: [],
        } as fhir.Patient,
      } satisfies Partial<FormProcessorContextProps> as FormProcessorContextProps;

      const result = PersonAttributeAdapter.getInitialValue(mockField, null, mockProcessorContext);
      expect(result).toBeUndefined();
    });

    it('should return valueString when person attribute exists', () => {
      const mockProcessorContext = {
        patient: {
          id: 'test-patient',
          extension: [
            {
              url: 'http://fhir.openmrs.org/ext/person-attribute/7ef225db-94db-4e40-9dd8-fb121d9dc370',
              valueString: 'test-attribute-value',
            },
          ],
        } as fhir.Patient,
      } satisfies Partial<FormProcessorContextProps> as FormProcessorContextProps;

      const field = { ...mockField };
      const result = PersonAttributeAdapter.getInitialValue(field, null, mockProcessorContext);

      expect(result).toBe('test-attribute-value');
      expect((field.meta as any).initialValue.refinedValue).toBe('test-attribute-value');
    });

    it('should return valueReference when person attribute has reference', () => {
      const mockProcessorContext = {
        patient: {
          id: 'test-patient',
          extension: [
            {
              url: 'http://fhir.openmrs.org/ext/person-attribute/7ef225db-94db-4e40-9dd8-fb121d9dc370',
              valueReference: {
                reference: 'Location/test-location-uuid',
              },
            },
          ],
        } as fhir.Patient,
      } satisfies Partial<FormProcessorContextProps> as FormProcessorContextProps;

      const field = { ...mockField };
      const result = PersonAttributeAdapter.getInitialValue(field, null, mockProcessorContext);

      expect(result).toBe('Location/test-location-uuid');
      expect((field.meta as any).initialValue.refinedValue).toBe('Location/test-location-uuid');
    });
  });

  describe('getPreviousValue', () => {
    it('should return null', () => {
      const result = PersonAttributeAdapter.getPreviousValue(mockField, null, {} satisfies Partial<FormProcessorContextProps> as FormProcessorContextProps);
      expect(result).toBeNull();
    });
  });

  describe('getDisplayValue', () => {
    it('should return display property if present', () => {
      const value = { display: 'Test Display', value: 'test-value' };
      const result = PersonAttributeAdapter.getDisplayValue(mockField, value);
      expect(result).toBe('Test Display');
    });

    it('should return value as-is if no display property', () => {
      const value = 'simple-value';
      const result = PersonAttributeAdapter.getDisplayValue(mockField, value);
      expect(result).toBe('simple-value');
    });
  });

  describe('tearDown', () => {
    it('should execute without errors', () => {
      expect(() => PersonAttributeAdapter.tearDown()).not.toThrow();
    });
  });
});
