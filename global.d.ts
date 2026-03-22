/**
 * Ambient app types grouped by service. Do not import — use `Drive.*`, `Schema.*`, etc.
 */

/** Drive — MinIO object browser UI */
declare namespace Drive {
  type DriveType = "minio";

  interface SelectedFolder {
    folderId: string;
    name: string;
  }

  interface SelectedFile {
    file: File;
    id: string;
    displayName: string;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
  }

  interface FolderNode {
    id: string;
    name: string;
    children?: FolderNode[];
    webViewLink?: string;
  }

  interface SelectedItems {
    folders: string[];
    files: string[];
  }
}

/** Storage — MinIO / S3-compatible object storage */
declare namespace Storage {
  type StorageDriver = "minio";

  interface MinioEnvConfig {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  }

  interface MinioFolderRecord {
    id: string;
    name: string;
    parents: string[];
  }

  interface FolderEntry {
    id: string;
    name: string;
  }

  interface FileEntry {
    key: string;
    name: string;
    size: number;
    lastModified: Date;
  }

  interface FolderContentsResult {
    folders: FolderEntry[];
    files: FileEntry[];
  }

  interface StorageFileEntry {
    key: string;
    size: number;
    lastModified: Date;
  }

  interface ObjectStorage {
    ensureBucket(): Promise<void>;
    uploadFile(
      key: string,
      data: Buffer | Uint8Array | import("stream").Readable,
      options?: { contentType?: string; size?: number },
    ): Promise<void>;
    downloadFile(key: string): Promise<Buffer>;
    deleteFile(key: string): Promise<void>;
    listFiles(prefix?: string): Promise<StorageFileEntry[]>;
  }
}

/** Schema — introspection UI (models, enums, fields from API) */
declare namespace Schema {
  interface Field {
    name: string;
    type: string;
    isRequired: boolean;
    isList: boolean;
    isId: boolean;
    isUnique: boolean;
    hasDefault: boolean;
    defaultValue?: string;
    isRelation: boolean;
    attributes: string[];
    /** FK field names when @relation uses `fields: [...]` */
    relationFields?: string[];
  }

  interface Model {
    name: string;
    fields: Field[];
    mapName?: string;
    indexes: string[];
  }

  interface EnumType {
    name: string;
    values: string[];
  }

  interface SchemaData {
    models: Model[];
    enums: EnumType[];
    datasource: { provider: string; url: string } | null;
    generator: { provider: string } | null;
  }
}

/** Dashboard — stats overview */
declare namespace Dashboard {
  interface DashboardStats {
    totalModels: number;
    totalEnums: number;
    totalFields: number;
    totalRelations: number;
    totalIndexes: number;
    modelsWithMap: number;
    topFieldTypes: { type: string; count: number }[];
    relationTypeCount: {
      "one-to-one": number;
      "one-to-many": number;
      "many-to-one": number;
      "many-to-many": number;
    };
    modelsOverview: {
      name: string;
      fieldCount: number;
      relationCount: number;
      recordCount: number;
    }[];
  }
}

/** PrismaSchema — `lib/schema-parser` (raw Prisma file AST) */
declare namespace PrismaSchema {
  interface PrismaField {
    name: string;
    type: string;
    isRequired: boolean;
    isList: boolean;
    isId: boolean;
    isUnique: boolean;
    hasDefault: boolean;
    defaultValue?: string;
    isRelation: boolean;
    relationFields?: string[];
    attributes: string[];
    rawLine: string;
  }

  interface PrismaModel {
    name: string;
    fields: PrismaField[];
    mapName?: string;
    indexes: string[];
  }

  interface PrismaEnum {
    name: string;
    values: string[];
  }

  interface PrismaRelation {
    from: string;
    fromField: string;
    to: string;
    type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  }

  interface ParsedSchema {
    models: PrismaModel[];
    enums: PrismaEnum[];
    relations: PrismaRelation[];
    datasource: {
      provider: string;
      url: string;
    } | null;
    generator: {
      provider: string;
    } | null;
    rawContent: string;
  }
}

/** Relations — graph / API relation shape */
declare namespace Relations {
  interface Relation {
    from: string;
    fromField: string;
    to: string;
    type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  }
}

/** Crud — CRUD operations */
declare namespace Crud {
  interface PageData {
    records: RecordRow[];
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  }
}

/** Ui — shared primitives */
declare namespace Ui {
  type ButtonProps = import("react").ComponentPropsWithoutRef<"button"> & {
    asChild?: boolean;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  };
}
