import { getGlobalStore } from '@openmrs/esm-framework';
import { ObsAdapter } from '../adapters/obs-adapter';
import { OrdersAdapter } from '../adapters/orders-adapter';
import { EncounterDiagnosisAdapter } from '../adapters/encounter-diagnosis-adapter';
import { astCache } from '../utils/ast-cache';
import { pageObserver } from '../components/sidebar/page-observer';
import { clearRegistryCache } from '../registry/registry-cache';
import { type FormsRegistryStoreState } from '../registry/registry';
import { FormsStore } from '../constants';
import { teardown as lifecycleTeardown } from '../lifecycle';

// Must return a FRESH object every call: the registry's register* functions mutate
// the store's containers in place, so a shared template object installed into the
// store would itself get polluted by the next registration.
function emptyFormsRegistryState(): FormsRegistryStoreState {
  return {
    controls: [],
    postSubmissionActions: [],
    expressionHelpers: {},
    fieldValidators: [],
    fieldValueAdapters: [],
    dataSources: [],
    formSchemaTransformers: [],
  };
}

/**
 * Resets the engine's module-level mutable state between tests (wired as a global
 * `afterEach` in tools/setup-tests.ts). Because vitest isolates test files, this
 * matters for leakage between tests WITHIN a file.
 *
 * Each entry here is also a refactoring target: when a piece of state is moved
 * into per-form context, delete its line.
 *
 * Known state NOT reset here: `baseRegistry` in src/utils/forms-loader.ts (the
 * legacy in-memory forms registry). It is module-private with no clear mechanism,
 * and no test currently writes to it.
 */
export function resetFormEngineModuleState() {
  const steps: Array<[string, () => void]> = [
    // Adapter "assigned ID" ledgers: module-level arrays tracking which obs/orders/
    // diagnoses have been bound to fields during hydration. Called directly because
    // lifecycle teardown only reaches adapters a mounted form registered.
    ['ObsAdapter.tearDown', () => ObsAdapter.tearDown()],
    ['OrdersAdapter.tearDown', () => OrdersAdapter.tearDown()],
    ['EncounterDiagnosisAdapter.tearDown', () => EncounterDiagnosisAdapter.tearDown()],
    // Adapters registered by mounted forms (src/lifecycle.ts keeps a module-level
    // Set), plus pageObserver.clear().
    ['lifecycle.teardown', () => lifecycleTeardown()],
    // pageObserver.clear() sets evaluatedPagesVisibility to false, but its initial
    // BehaviorSubject value is null ("not yet evaluated") — restore that.
    ['pageObserver.evaluatedPagesVisibility', () => pageObserver.setEvaluatedPagesVisibility(null)],
    // Compiled-expression AST cache (keyed by a 32-bit hash of the expression).
    ['astCache.clear', () => astCache.clear()],
    // Resolved registry items (controls, adapters, validators, ...).
    ['clearRegistryCache', () => clearRegistryCache()],
    // The registration arrays in the 'forms-engine-store' global store. Without
    // this, a registerControl/registerExpressionHelper call in one test is visible
    // to the next — and since the derived cache above IS cleared each test, a
    // leaked registration would take effect instead of being masked by the cache.
    [
      'forms-engine-store',
      () => {
        getGlobalStore<FormsRegistryStoreState>(FormsStore, emptyFormsRegistryState()).setState(
          emptyFormsRegistryState(),
        );
      },
    ],
  ];

  // Run every step even if one throws, so a single failure can't leave the rest of
  // the state leaked into subsequent tests.
  const failures: Array<{ step: string; error: unknown }> = [];
  for (const [name, step] of steps) {
    try {
      step();
    } catch (error) {
      failures.push({ step: name, error });
    }
  }
  if (failures.length) {
    throw new Error(
      `resetFormEngineModuleState: ${failures.length} step(s) failed: ${failures
        .map(({ step, error }) => `${step} (${error})`)
        .join(', ')}`,
    );
  }
}
