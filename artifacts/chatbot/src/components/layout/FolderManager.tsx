import React, { useState } from "react";
import { Folder, FolderPlus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useListOpenaiFolders,
  useCreateOpenaiFolder,
  useUpdateOpenaiFolder,
  useDeleteOpenaiFolder,
  getListOpenaiFoldersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface FolderManagerProps {
  selectedFolderId: number | null;
  onSelectFolder: (id: number | null) => void;
}

function FolderItem({
  folder,
  isSelected,
  onSelect,
  onDeleted,
}: {
  folder: { id: number; name: string };
  isSelected: boolean;
  onSelect: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(folder.name);
  const queryClient = useQueryClient();
  const updateMutation = useUpdateOpenaiFolder();
  const deleteMutation = useDeleteOpenaiFolder();

  const commitRename = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== folder.name) {
      updateMutation.mutate(
        { id: folder.id, data: { name: trimmed } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListOpenaiFoldersQueryKey() }) },
      );
    } else {
      setValue(folder.name);
    }
    setEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate(
      { id: folder.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiFoldersQueryKey() });
          onDeleted();
        },
      },
    );
  };

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
      onClick={onSelect}
    >
      <Folder className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
      {editing ? (
        <input
          className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm outline-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setValue(folder.name); setEditing(false); }
            e.stopPropagation();
          }}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <span className="flex-1 truncate text-xs">{folder.name}</span>
      )}
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            <Pencil className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function FolderManager({ selectedFolderId, onSelectFolder }: FolderManagerProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();
  const { data: folderList = [] } = useListOpenaiFolders();
  const createMutation = useCreateOpenaiFolder();

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) { setCreating(false); return; }
    createMutation.mutate(
      { data: { name: trimmed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiFoldersQueryKey() });
          setCreating(false);
          setNewName("");
        },
      },
    );
  };

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-primary"
          onClick={() => setCreating(true)}
          title="New folder"
        >
          <FolderPlus className="h-3 w-3" />
        </Button>
      </div>

      {/* All conversations (no folder filter) */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
          selectedFolderId === null
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-3.5 w-3.5 text-muted-foreground" />
        <span>All conversations</span>
      </div>

      {folderList.map((f) => (
        <FolderItem
          key={f.id}
          folder={f}
          isSelected={selectedFolderId === f.id}
          onSelect={() => onSelectFolder(f.id)}
          onDeleted={() => { if (selectedFolderId === f.id) onSelectFolder(null); }}
        />
      ))}

      {creating && (
        <div className="flex items-center gap-1 px-2 py-1">
          <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            className="flex-1 min-w-0 bg-transparent border-b border-primary text-xs outline-none"
            placeholder="Folder name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            onBlur={handleCreate}
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleCreate}>
            <Check className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setCreating(false); setNewName(""); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
