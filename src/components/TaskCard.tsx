import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Calendar, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    due_date: string | null;
    task_labels?: Array<{ label_id: string; labels: { id: string; name: string; color: string } | null }>;
  };
  isDragging?: boolean;
  onUpdate?: (updates: Record<string, unknown>) => void;
  onDelete?: () => void;
}

const priorityConfig = {
  low: { label: "Low", className: "bg-priority-low/15 text-priority-low border-priority-low/30" },
  medium: { label: "Med", className: "bg-priority-medium/15 text-priority-medium border-priority-medium/30" },
  high: { label: "High", className: "bg-priority-high/15 text-priority-high border-priority-high/30" },
} as const;

export function TaskCard({ task, isDragging, onUpdate, onDelete }: TaskCardProps) {
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        (isDragging || isSortableDragging) && "rotate-2 opacity-90 shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
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
            {task.due_date && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}
