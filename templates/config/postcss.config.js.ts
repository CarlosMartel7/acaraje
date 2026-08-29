import { code } from "ts-poet";

// NOTE: the original source file for postcss.config.js was byte-for-byte identical to
// next.config.js (same nextConfig/typescript.ignoreBuildErrors object) — a pre-existing
// copy-paste bug, same pattern as the earlier select-drive.tsx/use-crud.ts incidents. Since the
// project depends on tailwindcss + autoprefixer (see config/package.json.ts) and Next.js's own
// scaffold always pairs them this way, this is the standard, well-established replacement rather
// than an invented one.
export const writePostcssConfig = () => code`
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

export default writePostcssConfig;
