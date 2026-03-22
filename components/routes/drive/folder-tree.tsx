"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, MoreHorizontal, Pencil, FolderPlus, Trash2, Check, ExternalLink } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FolderTreeProps {
  folders: Drive.FolderNode[];
  selectedId?: string | null;
  onSelect?: (folder: Drive.FolderNode) => void;
  onDelete?: (folder: Drive.FolderNode) => void;
  onRename?: (folder: Drive.FolderNode, newName: string) => void;
  onCreateFolder?: (parent?: Drive.FolderNode, name?: string) => void;
  defaultExpanded?: Set<string>;
}

function FolderTreeItem({
  folder,
  depth,
  selectedId,
  onSelect,
  onDelete,
  onRename,
  onCreateFolder,
  expandedIds,
  toggleExpand,
}: {
  folder: Drive.FolderNode;
  depth: number;
  selectedId?: string | null;
  onSelect?: (folder: Drive.FolderNode) => void;
  onDelete?: (folder: Drive.FolderNode) => void;
  onRename?: (folder: Drive.FolderNode, newName: string) => void;
  onCreateFolder?: (parent?: Drive.FolderNode, name?: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedId === folder.id;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename?.(folder, trimmed);
    }
    setIsRenaming(false);
    setRenameValue(folder.name);
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer group",
          "hover:bg-accent/50 transition-colors",
          isSelected && "bg-primary/20 border border-primary-foreground/30",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => !isRenaming && onSelect?.(folder)}
      >
        <button
          type="button"
          className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(folder.id);
          }}
        >
          {hasChildren ? isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" /> : <span className="w-4" />}
        </button>
        {isExpanded && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-primary-foreground/80 flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        {isRenaming ? (
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setIsRenaming(false);
                setRenameValue(folder.name);
              }
            }}
            className="h-6 text-xs font-mono flex-1 min-w-0"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={cn("text-sm font-mono truncate flex-1 min-w-0", isSelected ? "text-primary-foreground" : "text-foreground")}>
            {folder.name}
          </span>
        )}
        {!isRenaming && (folder.webViewLink || onDelete || onRename || onCreateFolder) && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[160px] rounded-md border border-border/50 bg-card p-1 shadow-lg z-50"
                align="end"
                sideOffset={4}
                onClick={(e) => e.stopPropagation()}
              >
                {folder.webViewLink && (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none hover:bg-accent"
                    onSelect={() => window.open(folder.webViewLink, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Drive
                  </DropdownMenu.Item>
                )}
                {onRename && (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none hover:bg-accent"
                    onSelect={() => {
                      setIsRenaming(true);
                      setRenameValue(folder.name);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Rename
                  </DropdownMenu.Item>
                )}
                {onCreateFolder && (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none hover:bg-accent"
                    onSelect={() => onCreateFolder(folder)}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    New folder
                  </DropdownMenu.Item>
                )}
                {onDelete && (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none text-destructive hover:bg-destructive/10"
                    onSelect={() => onDelete(folder)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onCreateFolder={onCreateFolder}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedId,
  onSelect,
  onDelete,
  onRename,
  onCreateFolder,
  defaultExpanded = new Set(),
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(defaultExpanded);
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateRoot = () => {
    const name = newFolderName.trim() || "New folder";
    onCreateFolder?.(undefined, name);
    setIsCreatingRoot(false);
    setNewFolderName("");
  };

  const handleCancelCreate = () => {
    setIsCreatingRoot(false);
    setNewFolderName("");
  };

  return (
    <div className="space-y-0.5">
      {onCreateFolder && (
        <div className="mb-2">
          {isCreatingRoot ? (
            <div className="flex items-center gap-1">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={handleCancelCreate}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateRoot();
                  if (e.key === "Escape") handleCancelCreate();
                }}
                placeholder="New folder"
                className="h-8 text-xs font-mono flex-1 min-w-0"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 text-emerald-400 hover:text-emerald-300 flex-shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCreateRoot();
                }}
                title="Create folder"
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsCreatingRoot(true)}
            >
              <FolderPlus className="w-4 h-4" />
              New folder
            </Button>
          )}
        </div>
      )}
      {folders.map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onDelete={onDelete}
          onRename={onRename}
          onCreateFolder={onCreateFolder}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
}
