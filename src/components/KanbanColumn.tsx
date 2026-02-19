import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, ImagePlus, ImageOff, FolderInput } from "lucide-react";
import type { Category } from "@/hooks/useCategories";
import { useState } from "react";

interface KanbanColumnProps {
  column: { id: string; name: string; order_index: number; cover_image_url?: string | null; category_id?: string | null };
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    due_date: string | null;
    column_id: string;
    order_index: number;
    is_done?: boolean;
    task_labels?: Array<{ label_id: string; labels: { id: string; name: string; color: string } | null }>;
    task_attachments?: { count: number }[];
  }>;
  onRename: (name: string) => void;
  onDelete: () => void;
  onCreateTask: (title: string) => void;
  onUpdateTask: (id: string, updates: Record<string, unknown>) => void;
  onDeleteTask: (id: string) => void;
  onUploadCover?: (file: File) => void;
  onRemoveCover?: () => void;
  categories?: Category[];
  onChangeCategory?: (categoryId: string | null) => void;
  onMarkDone?: (taskId: string) => void;
  onMarkUndone?: (taskId: string) => void;
}

export function KanbanColumn({ column, tasks, onRename, onDelete, onCreateTask, onUpdateTask, onDeleteTask, onUploadCover, onRemoveCover, categories, onChangeCategory, onMarkDone, onMarkUndone }: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: column.id, data: { type: "column" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

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
      style={style}
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
        <div className="mb-3 flex items-center justify-between" {...attributes} {...listeners}>
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
              {categories && categories.length > 0 && onChangeCategory && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="mr-2 h-3.5 w-3.5" /> Move to Category
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {categories.map((cat) => (
                      <DropdownMenuItem
                        key={cat.id}
                        onClick={() => onChangeCategory(cat.id)}
                        className={column.category_id === cat.id ? "bg-accent" : ""}
                      >
                        <div
                          className="mr-2 h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onChangeCategory(null)}>
                      None (Uncategorized)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
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
                onMarkDone={onMarkDone ? () => onMarkDone(task.id) : undefined}
                onMarkUndone={onMarkUndone ? () => onMarkUndone(task.id) : undefined}
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
