import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
  { ignores: ["src/public/**/*"], },

  { files: ['src/**/*.js'], languageOptions: { sourceType: 'commonjs' } },
  { languageOptions: { globals: {  ...globals.node } } },
  pluginJs.configs.recommended,
  {
    rules: {
      'no-template-curly-in-string': 'warn',
      camelcase: ['warn', { ignoreGlobals: true }],
      'max-depth': ['warn'],
      'max-nested-callbacks': ['warn', { max: 4 }],
      'prefer-arrow-callback': 'warn',
      'prefer-const': 'warn',
      'prefer-template': 'warn',
      'sort-imports': 'warn',
      'no-loop-func': 'warn',
      "no-unused-vars": "warn",
    },
  },
];
