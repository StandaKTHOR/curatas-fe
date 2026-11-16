import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', 'docs/**', 'scratch/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    { files: ['**/*.{ts,tsx,js}'], languageOptions: {
        globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly',
            console: 'readonly', fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', FormData: 'readonly',
            File: 'readonly', Blob: 'readonly', Headers: 'readonly', Response: 'readonly', Request: 'readonly',
            HTMLElement: 'readonly', HTMLInputElement: 'readonly', HTMLSelectElement: 'readonly', Node: 'readonly',
            AbortController: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly',
            clearInterval: 'readonly', alert: 'readonly', atob: 'readonly', btoa: 'readonly', navigator: 'readonly',
            performance: 'readonly', requestAnimationFrame: 'readonly', MutationObserver: 'readonly', ResizeObserver: 'readonly',
            process: 'readonly', Buffer: 'readonly', __dirname: 'readonly' },
    }, rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
        '@typescript-eslint/no-empty-object-type': 'off',
    } },
);
