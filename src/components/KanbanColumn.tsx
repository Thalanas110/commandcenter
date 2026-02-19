import { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, ImagePlus, ImageOff } from "lucide-react";
import { useState } from "react";

interface KanbanColumnProps {
  column: { id: string; name: string; order_index: number; cover_image_url?: string | null };
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    due_date: string | null;
    column_id: string;
    order_index: number;
    task_labels?: Array<{ label_id: string; labels: { id: string; name: string; color: string } | null }>;
  }>;
  onRename: (name: string) => void;
  onDelete: () => void;
  onCreateTask: (title: string) => void;
  onUpdateTask: (id: string, updates: Record<string, unknown>) => void;
  onDeleteTask: (id: string) => void;
  onUploadCover?: (file: File) => void;
  onRemoveCover?: () => void;
}

export function KanbanColumn({ column, tasks, onRename, onDelete, onCreateTask, onUpdateTask, onDeleteTask, onUploadCover, onRemoveCover }: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleRename = () => {
    if (editName.trim() && editName !== column.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleAddTask = () => {
    if (newTitle.trim()) {
      onCreateTask(newTitle.trim());
      setNewTitle("");
      setIsAdding(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadCover) {
      onUploadCover(file);
    }
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg bg-kanban-column transition-colors ${isOver ? "ring-2 ring-primary/50" : ""
        }`}
    >
      {/* Cover image */}
      {column.cover_image_url && (
        <div className="relative h-60 w-full overflow-hidden rounded-t-lg">
          <img
            src={column.cover_image_url}
            alt={`${column.name} cover`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="p-3">
        <div className="mb-3 flex items-center justify-between">
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
              className="h-7 text-sm font-semibold"
            />
          ) : (
            <h3 className="text-sm font-semibold text-kanban-column-foreground">
              {column.name}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{tasks.length}</span>
            </h3>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setIsEditing(true); setEditName(column.name); }}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="mr-2 h-3.5 w-3.5" /> Set Cover
              </DropdownMenuItem>
              {column.cover_image_url && (
                <DropdownMenuItem onClick={onRemoveCover}>
                  <ImageOff className="mr-2 h-3.5 w-3.5" /> Remove Cover
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={(updates) => onUpdateTask(task.id, updates)}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}
          </SortableContext>
        </div>

        {isAdding ? (
          <div className="mt-2 space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              placeholder="Task title..."
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddTask}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewTitle(""); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Task
          </Button>
        )}
      </div>
    </div>
  );
}
