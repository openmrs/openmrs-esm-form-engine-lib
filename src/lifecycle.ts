import { pageObserver } from './components/sidebar/page-observer';
import { type FormFieldValueAdapter } from './types';

const formFieldAdapters = new Set<FormFieldValueAdapter>();

export function registerFormFieldAdaptersForCleanUp(formFieldAdaptersMap: Record<string, FormFieldValueAdapter>) {
  if (formFieldAdaptersMap) {
    Object.values(formFieldAdaptersMap).forEach((adapter) => {
      formFieldAdapters.add(adapter);
    });
  }
}
/**
 * Invoked on mounting the "FormEngine" component
 */
export function init() {
}

/**
 * Invoked on unmounting the "FormEngine" component
 */
export function teardown() {
  formFieldAdapters.forEach((adapter) => {
    try {
      adapter.tearDown();
    } catch (error) {
      // pass
    }
  });
  formFieldAdapters.clear();
  pageObserver.clear();
}
