export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureMinioBucketReady } = await import("./lib/storage/minio-storage");
    await ensureMinioBucketReady();
  }
}
