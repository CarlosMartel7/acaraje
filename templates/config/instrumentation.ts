import { code } from "ts-poet";

// NOTE: the original source destructured "ensureStorageBucketReady" from a dynamic import of
// "./lib/storage", but that barrel only exports the driver aliased as "ensureBucketReady" (see
// templates/lib/storage/index.ts) — fixed to the name that actually exists.
export const writeInstrumentation = () => code`
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureBucketReady } = await import("./lib/storage");
    await ensureBucketReady();
  }
}
`;

export default writeInstrumentation;
