import { beforeEach, vi } from 'vitest';
import { translateFrom } from '@openmrs/esm-framework';

/**
 * The framework's `translateFrom` mock returns the KEY for any module other than 'core'.
 * Call this at the top of a test file that asserts user-facing text produced through
 * `translateFrom` (e.g. validation messages), so those assertions read the English
 * fallback, interpolated the way i18next would, instead of the key.
 */
export function withEnglishTranslationFallbacks() {
  beforeEach(() => {
    vi.mocked(translateFrom).mockImplementation((_moduleName, key, fallback, options) =>
      interpolate(fallback ?? key, options),
    );
  });
}

function interpolate(text: string, options?: Record<string, unknown>) {
  return Object.entries(options ?? {}).reduce(
    (result, [name, value]) => result.replace(new RegExp(`{{-?\\s*${name}\\s*}}`, 'g'), String(value)),
    text,
  );
}
