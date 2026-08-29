import { code } from "ts-poet";

const tsconfigJson = {
  compilerOptions: {
    target: "es5",
    downlevelIteration: true,
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    plugins: [{ name: "next" }],
    paths: { "@/*": ["./*"] },
  },
  include: ["next-env.d.ts", "global.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"],
};

export const writeTsconfigJson = () => code`${JSON.stringify(tsconfigJson, null, 2)}\n`;

export default writeTsconfigJson;
