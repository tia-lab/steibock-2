export default [
	{
		ignores: [
			"app/**",
			"craft/**",
			"node_modules/**",
			".next/**"
		]
	},
	{
		files: ["scripts/**/*.mjs"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				console: "readonly",
				process: "readonly"
			}
		},
		rules: {
			"no-undef": "error",
			"no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
		}
	}
];
