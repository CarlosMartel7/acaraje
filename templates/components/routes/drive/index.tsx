import { code, imp } from "ts-poet";

const useState = imp("useState@react")
const useEffect = imp("useEffect@react")
const useSearchParams = imp("useSearchParams@next/navigation")
const SelectDrive = imp("SelectDrive@@/components/routes/drive/select-drive")
const TargetFolder = imp("TargetFolder@@/components/routes/drive/target-folder")
const FilesToUpload = imp("FilesToUpload@@/components/routes/drive/files-to-upload")
const DriveUploadHeader = imp("DriveUploadHeader@@/components/routes/skeletons")
const DriveUploadBodySkeleton = imp("DriveUploadBodySkeleton@@/components/routes/skeletons")
const useDriveFolders = imp("useDriveFolders@@/query/hooks/use-drive")
const RawDriveFolder = imp("t:RawDriveFolder@@/query/hooks/use-drive")

export const writeDrivePage = () => code`
function structureFolders(folders: ${RawDriveFolder}[]): Drive.FolderNode[] {
  const filtered = folders.filter((f) => f.parents?.[0] !== f.id);
  const byId = new Map<string, Drive.FolderNode>();
  for (const f of filtered) {
    byId.set(f.id, { id: f.id, name: f.name, children: [], webViewLink: f.webViewLink });
  }
  const roots: Drive.FolderNode[] = [];
  for (const f of filtered) {
    const node = byId.get(f.id)!;
    const parentId = f.parents?.[0];
    if (!parentId || !byId.has(parentId)) {
      roots.push(node);
    } else {
      const parent = byId.get(parentId)!;
      (parent.children ??= []).push(node);
    }
  }
  roots.sort((a, b) => a.name.localeCompare(b.name));
  for (const node of byId.values()) {
    if (node.children?.length) node.children.sort((a, b) => a.name.localeCompare(b.name));
  }
  return roots;
}

export default function DrivePageInner() {
  const searchParams = ${useSearchParams}();
  const [selectedDrive, setSelectedDrive] = ${useState}<Drive.DriveType>("minio");
  const [selectedFolder, setSelectedFolder] = ${useState}<Drive.SelectedFolder | null>(null);
  const [files, setFiles] = ${useState}<Drive.SelectedFile[]>([]);
  const [fetchedFolders, setFetchedFolders] = ${useState}<Drive.FolderNode[]>([]);

  const { data: foldersData, isLoading: foldersLoading } = ${useDriveFolders}();

  ${useEffect}(() => {
    const id = searchParams.get("folderId");
    if (id) setSelectedFolder({ folderId: id, name: "" });
  }, [searchParams]);

  ${useEffect}(() => {
    if (foldersData) setFetchedFolders(structureFolders(foldersData.folders ?? []));
  }, [foldersData]);

  return (
    <div className="p-8 space-y-6 animate-in">
      <${DriveUploadHeader} />

      {foldersLoading ? (
        <${DriveUploadBodySkeleton} />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <${SelectDrive} value={selectedDrive} onChange={setSelectedDrive} />
            <${TargetFolder}
              value={selectedFolder}
              onChange={setSelectedFolder}
              folders={fetchedFolders || []}
              setFolders={setFetchedFolders}
            />
          </div>
          <${FilesToUpload} files={files} setFiles={setFiles} selectedFolder={selectedFolder} />
        </>
      )}
    </div>
  );
}
`;

export default writeDrivePage;
