import { teardownBaseHandlerUtils } from './submission-handlers/base-handlers';

/**
 * Invoked on mounting the "FormEngine" component
 */
export function init() {
  // TODO: A perfect candidate for this would be setting up the registry
}

/**
 * Invoked on unmounting the "FormEngine" component
 */
export function teardown() {
  teardownBaseHandlerUtils();
}
