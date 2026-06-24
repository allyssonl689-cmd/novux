import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Config própria do backend (auto-suficiente — não depende dos plugins React da raiz,
// que não são instalados no job de CI do backend). Ambiente Node.
export default tseslint.config(
  { ignores: ['dist', '**/dist/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      // Permite a augmentação de tipos do Express (declare global { namespace Express })
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
);
