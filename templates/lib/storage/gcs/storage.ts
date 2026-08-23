import { code, imp } from "ts-poet";

const GcsStorageClient = imp("Storage:GcsStorageClient@@google-cloud/storage");
const Readable = imp("t:Readable@stream");

export const writeGcsStorage = () => code`
import { getGcsConfig } from "./config";

let client: ${GcsStorageClient} | null = null;
let gcsImpl: GcsStorage | null = null;

export function getGcsClient(): ${GcsStorageClient} {
  if (!client) {
    const c = getGcsConfig();
    client = new ${GcsStorageClient}({
      projectId: c.projectId || undefined,
      ...(c.apiEndpoint ? { apiEndpoint: c.apiEndpoint } : {}),
    });
  }
  return client;
}

async function streamToBuffer(stream: ${Readable}): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export class GcsStorage implements Storage.ObjectStorage {
  constructor(private readonly bucket: string) { }

  async ensureBucket(): Promise<void> {
    const cli = getGcsClient();
    const [exists] = await cli.bucket(this.bucket).exists();
    if (!exists) await cli.createBucket(this.bucket);
  }

  async uploadFile(
    key: string,
    data: Buffer | Uint8Array | ${Readable},
    options?: { contentType?: string; size?: number },
  ): Promise<void> {
    // The GCS SDK's .save() takes a Buffer/string, not a stream, so a Readable is buffered in
    // memory first — fine for admin-panel-sized uploads, not ideal for very large files.
    const buffer = Buffer.isBuffer(data)
      ? data
      : data instanceof Uint8Array
        ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
        : await streamToBuffer(data);

    const file = getGcsClient().bucket(this.bucket).file(key);
    await file.save(buffer, {
      contentType: options?.contentType,
      resumable: false,
    });
  }

  async downloadFile(key: string): Promise<Buffer> {
    const [buffer] = await getGcsClient().bucket(this.bucket).file(key).download();
    return buffer;
  }

  async deleteFile(key: string): Promise<void> {
    await getGcsClient().bucket(this.bucket).file(key).delete({ ignoreNotFound: true });
  }

  async listFiles(prefix = ""): Promise<Storage.StorageFileEntry[]> {
    const [files] = await getGcsClient().bucket(this.bucket).getFiles({ prefix });
    return files.map((f) => ({
      key: f.name,
      size: Number(f.metadata.size ?? 0),
      lastModified: new Date(f.metadata.updated ?? Date.now()),
    }));
  }
}

export function getGcsStorage(): GcsStorage {
  if (!gcsImpl) {
    gcsImpl = new GcsStorage(getGcsConfig().bucket);
  }
  return gcsImpl;
}

/** Ensure default bucket exists on startup. */
export async function ensureGcsBucketReady(): Promise<void> {
  await getGcsStorage().ensureBucket();
}
`;

export default writeGcsStorage;
