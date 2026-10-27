module.exports = {
	root: true,
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:svelte/recommended',
		'prettier'
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		extraFileExtensions: ['.svelte']
	},
	rules: {
		// Svelte 4 components declare $$Props / $$Events / $$Slots for typing only.
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ varsIgnorePattern: '^\\$\\$(Props|Events|Slots)$' }
		],
		// TypeScript already checks for undefined names (and knows DOM types like
		// FormDataEntryValue that this rule doesn't).
		'no-undef': 'off'
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser',
				// Mirrors the onwarn filter in svelte.config.js (ESM, so it can't be
				// required here) so svelte/valid-compile skips the same warning.
				svelteConfig: {
					onwarn: (warning, handler) => {
						if (warning.code === 'element_invalid_self_closing_tag') return;
						handler(warning);
					}
				}
			}
		}
	]
};
