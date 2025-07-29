import { shouldRenderField } from './fieldRenderUtils';

describe('shouldRenderField', () => {
  it('should return false for transient fields with no value in embedded-view mode', () => {
    const sessionMode = 'embedded-view';
    const isTransient = true;
    const isEmpty = true;

    const result = shouldRenderField(sessionMode, isTransient, isEmpty);
    expect(result).toBe(false);
  });

  it('should return true for transient fields with a value in embedded-view mode', () => {
    const sessionMode = 'embedded-view';
    const isTransient = true;
    const isEmpty = false;

    const result = shouldRenderField(sessionMode, isTransient, isEmpty);
    expect(result).toBe(true);
  });

  it('should return true for non-transient fields in embedded-view mode', () => {
    const sessionMode = 'embedded-view';
    const isTransient = false;
    const isEmpty = true;

    const result = shouldRenderField(sessionMode, isTransient, isEmpty);
    expect(result).toBe(true);
  });

  it('should return true for any field in non-embedded modes', () => {
    const sessionMode = 'edit';
    const isTransient = true;
    const isEmpty = true;

    const result = shouldRenderField(sessionMode, isTransient, isEmpty);
    expect(result).toBe(true);
  });
});
