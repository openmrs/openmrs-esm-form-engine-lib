import setupFormEngineLibI18n from './setupI18n';
import { teardownBaseHandlerUtils } from './submission-handlers/base-handlers';

/**
 * Invoked on mounting the "FormEngine" component
 */
export function init() {
  // TODO: A perfect candidate for this would be setting up the registry
  // Setting up the i18n for the form engine library
  setupFormEngineLibI18n();
}

/**
 * Invoked on unmounting the "FormEngine" component
 */
export function teardown() {
  teardownBaseHandlerUtils();
}
