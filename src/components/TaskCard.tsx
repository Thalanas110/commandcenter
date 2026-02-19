import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Calendar, CheckSquare, CircleCheck, CircleDashed, Paperclip, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { useChecklists } from "@/hooks/useChecklists";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    due_date: string | null;
    is_done?: boolean;
    task_labels?: Array<{ label_id: string; labels: { id: string; name: string; color: string } | null }>;
    task_attachments?: { count: number }[];
  };
  isDragging?: boolean;
  onUpdate?: (updates: Record<string, unknown>) => void;
  onDelete?: () => void;
  onMarkDone?: () => void;
  onMarkUndone?: () => void;
}

const priorityConfig = {
  low: { label: "Low", className: "bg-priority-low/15 text-priority-low border-priority-low/30" },
  medium: { label: "Med", className: "bg-priority-medium/15 text-priority-medium border-priority-medium/30" },
  high: { label: "High", className: "bg-priority-high/15 text-priority-high border-priority-high/30" },
} as const;

export function TaskCard({ task, isDragging, onUpdate, onDelete, onMarkDone, onMarkUndone }: TaskCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.medium;
  const labels = task.task_labels?.filter((tl) => tl.labels) ?? [];

  const { items: checklistItems } = useChecklists(task.id);
  const completedCount = checklistItems.filter((i) => i.is_completed).length;
  const totalCount = checklistItems.length;

  // Overdue detection
  const isOverdue = (() => {
    if (!task.due_date || task.is_done) return false;
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  })();

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => setDialogOpen(true)}
        className={cn(
          "cursor-grab border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
          (isDragging || isSortableDragging) && "rotate-2 opacity-90 shadow-lg",
          task.is_done && "opacity-60 border-priority-low/40",
          isOverdue && "border-destructive/50 bg-destructive/5"
        )}
      >
        <div className="flex items-start gap-2">
          {/* Done toggle button */}
          {(onMarkDone || onMarkUndone) && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 shrink-0 mt-0.5",
                task.is_done
                  ? "text-priority-low hover:text-priority-low/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (task.is_done) {
                  onMarkUndone?.();
                } else {
                  onMarkDone?.();
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title={task.is_done ? "Mark as not done" : "Mark as done"}
            >
              {task.is_done ? (
                <CircleCheck className="h-4 w-4" />
              ) : (
                <CircleDashed className="h-4 w-4" />
              )}
            </Button>
          )}

          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium leading-snug",
              task.is_done && "line-through text-muted-foreground"
            )}>
              {task.title}
            </p>
            {task.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.className)}>
                {priority.label}
              </Badge>
              {labels.map((tl) => (
                <Badge
                  key={tl.label_id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{
                    backgroundColor: `${tl.labels!.color}20`,
                    color: tl.labels!.color,
                    borderColor: `${tl.labels!.color}50`,
                  }}
                >
                  {tl.labels!.name}
                </Badge>
              ))}
              {task.task_attachments && task.task_attachments[0]?.count > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  {task.task_attachments[0].count}
                </span>
              )}
              {task.due_date && (
                <span className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  isOverdue
                    ? "text-destructive font-semibold"
                    : "text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString()}
                  {isOverdue && " (overdue)"}
                </span>
              )}
              {totalCount > 0 && (
                <span className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  completedCount === totalCount ? "text-priority-low" : "text-muted-foreground"
                )}>
                  <CheckSquare className="h-3 w-3" />
                  {completedCount}/{totalCount}
                </span>
              )}
              {task.is_done && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-priority-low/15 text-priority-low border-priority-low/30">
                  Done
                </Badge>
              )}
            </div>
          </div>
          {onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>

      {onUpdate && onDelete && (
        <TaskDetailDialog
          task={task}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onUpdate={(updates) => onUpdate(updates)}
          onDelete={onDelete}
          onMarkDone={onMarkDone}
          onMarkUndone={onMarkUndone}
        />
      )}
    </>
  );
}
