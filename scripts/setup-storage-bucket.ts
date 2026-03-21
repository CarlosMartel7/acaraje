import { ensureMinioBucketReady } from "../lib/storage/minio-storage";

void ensureMinioBucketReady()
  .then(() => {
    console.log("Storage bucket ready.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
