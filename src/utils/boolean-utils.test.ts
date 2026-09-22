import { describe, expect, it } from 'vitest';
import { isTrue, isUuid } from './boolean-utils';

describe('isTrue', () => {
  it('passes booleans through', () => {
    expect(isTrue(true)).toBe(true);
    expect(isTrue(false)).toBe(false);
  });

  it('parses the literal string "true"', () => {
    expect(isTrue('true')).toBe(true);
  });

  it('treats every other string as false, including "TRUE" and "1"', () => {
    expect(isTrue('false')).toBe(false);
    expect(isTrue('TRUE')).toBe(false);
    expect(isTrue('1')).toBe(false);
    expect(isTrue('yes')).toBe(false);
    expect(isTrue('')).toBe(false);
  });

  it('coerces non-string, non-boolean values to their truthiness', () => {
    expect(isTrue(undefined)).toBe(false);
    expect(isTrue(null)).toBe(false);
    expect(isTrue(1 as any)).toBe(true);
    expect(isTrue(0 as any)).toBe(false);
  });
});

describe('isUuid', () => {
  it('accepts canonical UUIDs in either case', () => {
    expect(isUuid('9e1a2c9c-8bfa-4f52-b1f1-9b7a1a2c9c8b')).toBe(true);
    expect(isUuid('9E1A2C9C-8BFA-4F52-B1F1-9B7A1A2C9C8B')).toBe(true);
  });

  it('rejects anything that is not a dashed 8-4-4-4-12 hex string', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('9e1a2c9c8bfa4f52b1f19b7a1a2c9c8b')).toBe(false);
    expect(isUuid('9e1a2c9c-8bfa-4f52-b1f1')).toBe(false);
    expect(isUuid('')).toBe(false);
    // The engine treats form NAMES as the non-UUID branch of form lookups; a name
    // must never satisfy this predicate.
    expect(isUuid('Adult Return Visit Form')).toBe(false);
  });
});
