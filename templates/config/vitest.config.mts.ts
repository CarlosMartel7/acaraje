import { code, imp } from "ts-poet";

const path = imp("path=path")
const fileURLToPath = imp("fileURLToPath@url")
const defineConfig = imp("defineConfig@vitest/config")

export const writeVitestConfig = () => code`
const root = ${path}.dirname(${fileURLToPath}(import.meta.url));

export default ${defineConfig}({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "packages"],
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
`;

export default writeVitestConfig;
