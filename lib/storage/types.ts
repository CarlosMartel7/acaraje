import type { Readable } from "stream";

export interface StorageFileEntry {
  key: string;
  size: number;
  lastModified: Date;
}

/**
 * S3-compatible object storage — implement for MinIO now, GCS or another backend later.
 */
export interface ObjectStorage {
  ensureBucket(): Promise<void>;
  uploadFile(
    key: string,
    data: Buffer | Uint8Array | Readable,
    options?: { contentType?: string; size?: number },
  ): Promise<void>;
  downloadFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  listFiles(prefix?: string): Promise<StorageFileEntry[]>;
}
