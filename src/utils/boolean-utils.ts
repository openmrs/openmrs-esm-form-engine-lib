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

/**
 * Checks whether a string is a "like" UUID.
 * A "like" UUID is a string that has the format of a UUID, but is not necessarily a valid UUID.
 */
export function isLikeUUID(s: string): boolean {
  const pattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return pattern.test(s);
}
