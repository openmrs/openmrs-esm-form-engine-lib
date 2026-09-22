import { type ComponentType } from 'react';
import {
  type DataSource,
  type FormFieldInputProps,
  type FormFieldValidator,
  type FormFieldValueAdapter,
  type FormSchemaTransformer,
  type PostSubmissionAction,
} from '../types';

interface FormRegistryCache {
  validators: Record<string, FormFieldValidator>;
  controls: Record<string, ComponentType<FormFieldInputProps>>;
  fieldValueAdapters: Record<string, FormFieldValueAdapter>;
  postSubmissionActions: Record<string, PostSubmissionAction>;
  dataSources: Record<string, DataSource<any>>;
  formSchemaTransformers: Record<string, FormSchemaTransformer>;
}

// Module-level cache of resolved registry items. Lives in its own module (rather
// than registry.ts) so that test utilities can clear it without importing the full
// registry module graph, and without expanding the public API surface (src/index.ts
// re-exports everything from registry.ts).
export const registryCache: FormRegistryCache = {
  validators: {},
  controls: {},
  fieldValueAdapters: {},
  postSubmissionActions: {},
  dataSources: {},
  formSchemaTransformers: {},
};

/**
 * Empties every section of the registry cache in place. Intended for test isolation;
 * production code never invalidates the cache.
 */
export function clearRegistryCache() {
  Object.values(registryCache).forEach((section: Record<string, unknown>) => {
    Object.keys(section).forEach((key) => {
      delete section[key];
    });
  });
}
