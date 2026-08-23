import { code } from "ts-poet";

export const writeStorageLibIndex = (storage: "minio" | "gcs") => {
  const objectStorage = storage[0].toUpperCase() + storage.slice(1)

  // Driver-specific names stay available for direct access, aliased to the generic names that
  // the storage-agnostic consumers (templates/api/drive/*) actually import from "@/lib/storage".
  return code`
export {
    get${objectStorage}Storage,
    get${objectStorage}Storage as getObjectStorage,
    ensure${objectStorage}BucketReady,
    ensure${objectStorage}BucketReady as ensureBucketReady,
    get${objectStorage}Client,
    ${objectStorage}Storage
} from "./storage";
export {
    get${objectStorage}Config,
    get${objectStorage}Config as getStorageConfig
} from "./config"
export {
    listFolderContents,
    listFolderContents as listStorageFolderContents
} from "./contents"
export {
    list${objectStorage}FoldersFlat,
    list${objectStorage}FoldersFlat as listStorageFoldersFlat,
    create${objectStorage}Folder,
    create${objectStorage}Folder as createStorageFolder,
    delete${objectStorage}FolderRecursive,
    delete${objectStorage}FolderRecursive as deleteStorageFolderRecursive
} from "./folders"

export { normalizeFolderPrefix, sanitizeObjectName, sanitizeFolderSegment } from "./paths";
    `

}

export default writeStorageLibIndex
