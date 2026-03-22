import * as Minio from "minio";
import type { Readable } from "stream";
import { getMinioConfig } from "./config";

let client: Minio.Client | null = null;
let minioImpl: MinioStorage | null = null;

export function getMinioClient(): Minio.Client {
  if (!client) {
    const c = getMinioConfig();
    client = new Minio.Client({
      endPoint: c.endPoint,
      port: c.port,
      useSSL: c.useSSL,
      accessKey: c.accessKey,
      secretKey: c.secretKey,
    });
  }
  return client;
}

export class MinioStorage implements Storage.ObjectStorage {
  constructor(private readonly bucket: string) {}

  async ensureBucket(): Promise<void> {
    const cli = getMinioClient();
    const exists = await cli.bucketExists(this.bucket);
    if (!exists) await cli.makeBucket(this.bucket, "");
  }

  async uploadFile(
    key: string,
    data: Buffer | Uint8Array | Readable,
    options?: { contentType?: string; size?: number },
  ): Promise<void> {
    const cli = getMinioClient();
    const meta: Record<string, string> = {};
    if (options?.contentType) meta["Content-Type"] = options.contentType;

    if (Buffer.isBuffer(data)) {
      await cli.putObject(this.bucket, key, data, data.length, meta);
      return;
    }
    if (data instanceof Uint8Array) {
      const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      await cli.putObject(this.bucket, key, buf, buf.length, meta);
      return;
    }
    const size = options?.size;
    if (size == null) throw new Error("size is required when uploading a Readable stream");
    await cli.putObject(this.bucket, key, data, size, meta);
  }

  async downloadFile(key: string): Promise<Buffer> {
    const stream = await getMinioClient().getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async deleteFile(key: string): Promise<void> {
    await getMinioClient().removeObject(this.bucket, key);
  }

  async listFiles(prefix = ""): Promise<Storage.StorageFileEntry[]> {
    const out: Storage.StorageFileEntry[] = [];
    const stream = getMinioClient().listObjectsV2(this.bucket, prefix, true);
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (obj) => {
        if ("name" in obj && obj.name) {
          out.push({
            key: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        }
      });
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });
    return out;
  }
}

export function getMinioStorage(): MinioStorage {
  if (!minioImpl) {
    minioImpl = new MinioStorage(getMinioConfig().bucket);
  }
  return minioImpl;
}

/** Ensure default bucket exists on startup. */
export async function ensureMinioBucketReady(): Promise<void> {
  await getMinioStorage().ensureBucket();
}
