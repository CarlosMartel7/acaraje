import { code, imp } from "ts-poet";

const Dispatch = imp("t:Dispatch@react")
const SetStateAction = imp("t:SetStateAction@react")
const FolderOpen = imp("FolderOpen@lucide-react")
const Card = imp("Card@@/components/ui/card")
const FolderTree = imp("FolderTree@./folder-tree")
const AcarajeCalls_drive = imp("AcarajeCalls_drive=./[[api-calls]]")

export const writeTargetFolderComponent = () => code`
function removeFolderFromTree(nodes: Drive.FolderNode[], id: string): Drive.FolderNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: n.children ? removeFolderFromTree(n.children, id) : undefined,
    }));
}

function renameFolderInTree(nodes: Drive.FolderNode[], id: string, newName: string): Drive.FolderNode[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, name: newName }
      : {
        ...n,
        children: n.children ? renameFolderInTree(n.children, id, newName) : undefined,
      },
  );
}

function addSubfolderToTree(
  nodes: Drive.FolderNode[],
  parentId: string,
  newFolder: Drive.FolderNode,
): Drive.FolderNode[] {
  return nodes.map((n) =>
    n.id === parentId
      ? {
        ...n,
        children: [...(n.children || []), newFolder],
      }
      : {
        ...n,
        children: n.children ? addSubfolderToTree(n.children, parentId, newFolder) : undefined,
      },
  );
}

interface TargetFolderProps {
  value: Drive.SelectedFolder | null;
  onChange: (value: Drive.SelectedFolder | null) => void;
  folders: Drive.FolderNode[];
  setFolders: ${Dispatch}<${SetStateAction}<Drive.FolderNode[]>>;
}

export function TargetFolder({ value, onChange, folders, setFolders }: TargetFolderProps) {
  const { handleDelete, handleRename, handleCreatefolder } = ${AcarajeCalls_drive}(
    setFolders,
    removeFolderFromTree,
    renameFolderInTree,
    addSubfolderToTree,
    onChange,
    value,
  );

  return (
    <${Card} className="p-[18px]">
      <div className="mb-3.5 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground/90">
          <${FolderOpen} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Target folder</h2>
          <p className="text-[11px] text-muted-foreground">Select a folder, or create, rename and delete folders</p>
        </div>
      </div>
      <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border bg-background/40 p-1.5">
          <${FolderTree}
            folders={folders}
            selectedId={value?.folderId ?? null}
            onSelect={(folder) => onChange({ folderId: folder.id, name: folder.name })}
            onDelete={handleDelete}
            onRename={handleRename}
            onCreateFolder={handleCreatefolder}
            defaultExpanded={new Set(["root", "1abc", "2def", "3ghi"])}
          />
      </div>
    </${Card}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeTargetFolderComponent;
