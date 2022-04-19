/**
 * Evaluates whether a value is truthy. This should be used when a string value is expected to parsed into a boolean ie.
 * ```bash
 *  'false' => false
 *  'true' => true
 * ```
 */
export function isTrue(value: string | boolean): boolean {
  if (typeof value == 'boolean') {
    return value;
  }
  if (typeof value == 'string') {
    return value == 'true';
  }
  // TODO: throw an exception?
  return !!value;
}
