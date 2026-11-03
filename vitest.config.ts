import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  cacheDir: './.cache/vitest',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(fileURLToPath(new URL('.',import.meta.url)), 'src') } },
  test: { exclude: [...configDefaults.exclude, 'scratch/**'], environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
});
