import javascript from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import typescript from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "dist/**",
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
  ]),
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  {
    rules: {
      curly: ["error", "all"],
      "one-var": ["error", "never"],
      "no-nested-ternary": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.flat.recommended.rules,
  },
]);
