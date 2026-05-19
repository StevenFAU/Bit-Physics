// Flat-config ESLint (ESLint 10.x) — strict TypeScript with the
// recommended-type-checked rule set.
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "preflight/node_modules/**",
      "preflight/out/**",
      // Config files + preflight scripts live outside tsconfig.json's
      // include set; lint them with the non-type-aware ruleset only.
      "eslint.config.js",
      "vitest.config.ts",
      "preflight/*.mjs",
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
