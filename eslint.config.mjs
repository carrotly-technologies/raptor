import jsEslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import pluginUnusedImports from 'eslint-plugin-unused-imports';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(jsEslint.configs.recommended, ...tsEslint.configs.recommended, prettier, {
    languageOptions: {
        parserOptions: {
            project: 'tsconfig.json',
            tsconfigRootDir: import.meta.dirname,
            sourceType: 'module',
        },
    },
    plugins: {
        'unused-imports': pluginUnusedImports,
    },
    ignores: ['eslint.config.mjs'],
    rules: {
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
            'warn',
            {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                argsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            },
        ],
    },
});
