import { teardownBaseHandlerUtils } from './submission-handlers/base-handlers';

/**
 * Invoked on mounting the "OHRIForm" component
 */
export function init() {
  // TODO: A perfect candidate for this would be setting up the registry
}

/**
 * Invoked on unmounting the "OHRIForm" component
 */
export function teardown() {
  teardownBaseHandlerUtils();
}
