import fs from 'fs'
import path from 'path'
import writeStorageLibIndex from '../../templates/lib/storage/index'
import writeStoragePaths from '../../templates/lib/storage/paths'
import writeMinioConfig from '../../templates/lib/storage/minio/config'
import writeMinioStorage from '../../templates/lib/storage/minio/storage'
import writeMinioContents from '../../templates/lib/storage/minio/contents'
import writeMinioFolders from '../../templates/lib/storage/minio/folders'
import writeGcsConfig from '../../templates/lib/storage/gcs/config'
import writeGcsStorage from '../../templates/lib/storage/gcs/storage'
import writeGcsContents from '../../templates/lib/storage/gcs/contents'
import writeGcsFolders from '../../templates/lib/storage/gcs/folders'
import writeDriveContents from '../../templates/api/drive/contents/route'
import writeDriveDelete from '../../templates/api/drive/delete/route'
import writeDriveFolders from '../../templates/api/drive/folders/route'
import writeDriveStorageConfig from '../../templates/api/drive/storage-config/route'
import writeDriveUpload from '../../templates/api/drive/upload/route'

export function generateStorage(storage: "minio" | "gcs", baseDir: string = process.cwd()): void {
  const libDir = path.join(baseDir, "lib", "storage")
  const driveDir = path.join(baseDir, "app", "api", "drive")

  fs.mkdirSync(libDir, { recursive: true })

  const driverFiles =
    storage === "minio"
      ? {
        "config.ts": writeMinioConfig(),
        "storage.ts": writeMinioStorage(),
        "contents.ts": writeMinioContents(),
        "folders.ts": writeMinioFolders(),
      }
      : {
        "config.ts": writeGcsConfig(),
        "storage.ts": writeGcsStorage(),
        "contents.ts": writeGcsContents(),
        "folders.ts": writeGcsFolders(),
      }

  fs.writeFileSync(path.join(libDir, "index.ts"), writeStorageLibIndex(storage).toString())
  fs.writeFileSync(path.join(libDir, "paths.ts"), writeStoragePaths().toString())
  for (const [fileName, code] of Object.entries(driverFiles)) {
    fs.writeFileSync(path.join(libDir, fileName), code.toString())
  }

  const routeFiles: Record<string, ReturnType<typeof writeDriveContents>> = {
    contents: writeDriveContents(),
    delete: writeDriveDelete(storage),
    folders: writeDriveFolders(storage),
    "storage-config": writeDriveStorageConfig(storage),
    upload: writeDriveUpload(storage),
  }

  for (const [routeName, code] of Object.entries(routeFiles)) {
    const routeDir = path.join(driveDir, routeName)
    fs.mkdirSync(routeDir, { recursive: true })
    fs.writeFileSync(path.join(routeDir, "route.ts"), code.toString())
  }
}
