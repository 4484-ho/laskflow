import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Forbid @/server/** imports from client-side directories.
  // src/hooks/** is included proactively (hooks added in Task E2).
  // src/app/** is excluded intentionally: Server Components legitimately import @/server/**.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/stores/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/server/**"],
              message: "Do not import server code from client. Use API routes or call domain functions from Server Components.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
