import { code } from "ts-poet";

export const writeGcsConfig = () => code`
export function getGcsConfig(): Storage.GcsEnvConfig {
  return {
    projectId: process.env.GCS_PROJECT_ID ?? "",
    bucket: process.env.GCS_BUCKET ?? "acaraje-dev",
    apiEndpoint: process.env.GCS_API_ENDPOINT || undefined,
  };
}
`;

export default writeGcsConfig;
