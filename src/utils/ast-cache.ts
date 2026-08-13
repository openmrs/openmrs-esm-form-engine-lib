import { type compile } from '@openmrs/esm-framework';

// Cache of compiled expression ASTs keyed by a hash of the expression source.
// Lives in its own module (rather than expression-runner.ts) so that test utilities
// can clear it without importing the expression runner's full module graph
// (which reaches the registry and, through it, every inbuilt control).
export const astCache = new Map<number, ReturnType<typeof compile>>();
