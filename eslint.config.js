const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const vue = require('eslint-plugin-vue');

const compat = new FlatCompat({
	baseDirectory: __dirname, // Specify the base directory
	recommendedConfig: js.configs.recommended,
});

module.exports = [
	{
		languageOptions: {
			ecmaVersion: 'latest',
		},
		linterOptions: {
			noInlineConfig: false,
			reportUnusedDisableDirectives: true,
		},
		plugins: {
			vue: vue,
		},
		rules: {
			indent: ['error', 'tab', { SwitchCase: 1 }],
			'linebreak-style': ['error', 'unix'],
			quotes: ['error', 'single', { allowTemplateLiterals: true }],
			semi: ['error', 'always'],
			'no-empty': 'off',
		},
	},
	...compat.extends('plugin:vue/vue3-essential'),
	...compat.extends('eslint:recommended'),
	...compat.env({
		browser: true,
		node: true,
		commonjs: true,
		es2021: true,
	}),
];
