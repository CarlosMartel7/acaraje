import { code } from "ts-poet";

export const writeNextConfig = () => code`
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
`;

export default writeNextConfig;
