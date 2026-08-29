import { code } from "ts-poet";

export type DbProvider = "postgresql" | "mysql" | "sqlite";
export type StorageProvider = "minio" | "gcs";

const POSTGRES_SERVICE = `  postgres:
    image: postgres:16-alpine
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: acaraje_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d acaraje_dev"]
      interval: 5s
      timeout: 5s
      retries: 5`;

const MYSQL_SERVICE = `  mysql:
    image: mysql:8
    ports:
      - "3307:3306"
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: acaraje_dev
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-ppassword"]
      interval: 5s
      timeout: 5s
      retries: 5`;

const MINIO_SERVICE = `  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"`;

const GCS_SERVICE = `  # GCS emulator for local testing. No init container needed — bucket creation is handled
  # app-side via ensureGcsBucketReady(), same as MinIO's ensureMinioBucketReady().
  fake-gcs-server:
    image: fsouza/fake-gcs-server:latest
    ports:
      - "4443:4443"
    volumes:
      - gcs_data:/data
    command:
      - -scheme=http
      - -backend=filesystem
      - -filesystem-root=/data
      - -public-host=localhost:4443`;

const DB_VOLUME: Record<DbProvider, string | null> = {
  postgresql: "postgres_data",
  mysql: "mysql_data",
  // File-based — no container, no volume.
  sqlite: null,
};

const STORAGE_VOLUME: Record<StorageProvider, string> = {
  minio: "minio_data",
  gcs: "gcs_data",
};

/**
 * Built in parts from what the user actually picked during `init`: only the chosen database gets
 * a service (sqlite gets none — it's file-based), and only the chosen storage backend's service
 * is included, so picking minio never drags fake-gcs-server (or vice versa) into the compose file.
 */
export const writeDockerCompose = (dbProvider: DbProvider, storage: StorageProvider) => {
  const services: string[] = [];
  if (dbProvider === "postgresql") services.push(POSTGRES_SERVICE);
  if (dbProvider === "mysql") services.push(MYSQL_SERVICE);
  services.push(storage === "minio" ? MINIO_SERVICE : GCS_SERVICE);

  const volumeNames = [DB_VOLUME[dbProvider], STORAGE_VOLUME[storage]].filter(
    (v): v is string => v !== null,
  );
  const volumes = volumeNames.map((v) => `  ${v}:`).join("\n");

  const body = `services:\n${services.join("\n\n")}\n\nvolumes:\n${volumes}\n`;

  return code`${body}`;
};

export default writeDockerCompose;
