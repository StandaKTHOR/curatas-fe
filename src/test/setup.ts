import * as matchers from '@testing-library/jest-dom/matchers';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// jest-dom's bundled Vitest augmentation still uses the pre-v5 Assertion signature.
declare module 'vitest' {
  interface Assertion<R extends void | Promise<void> = void, T = unknown>
    extends TestingLibraryMatchers<T, R> {}
}
expect.extend(matchers);
afterEach(cleanup);
