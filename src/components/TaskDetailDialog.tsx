import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useChecklists } from "@/hooks/useChecklists";
import { Calendar, Trash2, Plus, X, CheckSquare, AlignLeft, Flag, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityConfig = {
    low: { label: "Low", className: "bg-priority-low/15 text-priority-low border-priority-low/30" },
    medium: { label: "Medium", className: "bg-priority-medium/15 text-priority-medium border-priority-medium/30" },
    high: { label: "High", className: "bg-priority-high/15 text-priority-high border-priority-high/30" },
} as const;

interface TaskDetailDialogProps {
    task: {
        id: string;
        title: string;
        description: string | null;
        priority: string;
        due_date: string | null;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (updates: Record<string, unknown>) => void;
    onDelete: () => void;
}

export function TaskDetailDialog({ task, open, onOpenChange, onUpdate, onDelete }: TaskDetailDialogProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? "");
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [newChecklistItem, setNewChecklistItem] = useState("");
    const [isAddingItem, setIsAddingItem] = useState(false);

    const { items: checklistItems, createItem, updateItem, deleteItem } = useChecklists(task.id);

    const completedCount = checklistItems.filter((i) => i.is_completed).length;
    const totalCount = checklistItems.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const handleSaveTitle = useCallback(() => {
        const trimmed = editTitle.trim();
        if (trimmed && trimmed !== task.title) {
            onUpdate({ title: trimmed });
        }
        setIsEditingTitle(false);
    }, [editTitle, task.title, onUpdate]);

    const handleSaveDescription = useCallback(() => {
        const val = description.trim();
        if (val !== (task.description ?? "")) {
            onUpdate({ description: val || null });
        }
        setIsEditingDesc(false);
    }, [description, task.description, onUpdate]);

    const handleAddChecklistItem = useCallback(() => {
        const trimmed = newChecklistItem.trim();
        if (trimmed) {
            createItem.mutate(trimmed);
            setNewChecklistItem("");
        }
    }, [newChecklistItem, createItem]);

    const priority = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.medium;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="sr-only">Task Details</DialogTitle>
                    <DialogDescription className="sr-only">Edit the task title, description, priority, due date, and checklist items.</DialogDescription>
                    {/* Editable title */}
                    {isEditingTitle ? (
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                            autoFocus
                            className="text-lg font-semibold"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setEditTitle(task.title);
                                setIsEditingTitle(true);
                            }}
                            className="w-full text-left text-lg font-semibold hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                        >
                            {task.title}
                        </button>
                    )}
                </DialogHeader>

                <div className="space-y-5">
                    {/* Priority & Due Date row */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Flag className="h-4 w-4 text-muted-foreground" />
                            <Select
                                value={task.priority}
                                onValueChange={(val) => onUpdate({ priority: val })}
                            >
                                <SelectTrigger className="h-8 w-28">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(priorityConfig).map(([key, cfg]) => (
                                        <SelectItem key={key} value={key}>
                                            <Badge variant="outline" className={cn("text-xs", cfg.className)}>
                                                {cfg.label}
                                            </Badge>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <Input
                                type="date"
                                value={task.due_date ?? ""}
                                onChange={(e) => onUpdate({ due_date: e.target.value || null })}
                                className="h-8 w-40"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <AlignLeft className="h-4 w-4" />
                            Description
                        </div>
                        {isEditingDesc ? (
                            <div className="space-y-2">
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a more detailed description..."
                                    className="min-h-[100px] resize-y"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveDescription}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setIsEditingDesc(false); setDescription(task.description ?? ""); }}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditingDesc(true)}
                                className="w-full min-h-[60px] text-left text-sm rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors"
                            >
                                {task.description || (
                                    <span className="text-muted-foreground italic">Add a more detailed description...</span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Checklist */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <CheckSquare className="h-4 w-4" />
                                Checklist
                            </div>
                            {totalCount > 0 && (
                                <span className="text-xs text-muted-foreground">{completedCount}/{totalCount}</span>
                            )}
                        </div>

                        {totalCount > 0 && (
                            <Progress value={progressPercent} className="h-1.5" />
                        )}

                        <div className="space-y-1">
                            {checklistItems.map((item) => (
                                <div key={item.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/50 transition-colors">
                                    <Checkbox
                                        checked={item.is_completed}
                                        onCheckedChange={(checked) =>
                                            updateItem.mutate({ id: item.id, is_completed: checked === true })
                                        }
                                    />
                                    <span className={cn("flex-1 text-sm", item.is_completed && "line-through text-muted-foreground")}>
                                        {item.title}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => deleteItem.mutate(item.id)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {isAddingItem ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newChecklistItem}
                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAddChecklistItem();
                                        if (e.key === "Escape") { setIsAddingItem(false); setNewChecklistItem(""); }
                                    }}
                                    placeholder="Add an item..."
                                    autoFocus
                                    className="h-8"
                                />
                                <Button size="sm" onClick={handleAddChecklistItem}>Add</Button>
                                <Button size="sm" variant="ghost" onClick={() => { setIsAddingItem(false); setNewChecklistItem(""); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-muted-foreground"
                                onClick={() => setIsAddingItem(true)}
                            >
                                <Plus className="mr-1 h-4 w-4" /> Add an item
                            </Button>
                        )}
                    </div>

                    {/* Delete */}
                    <div className="border-t pt-4">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                onDelete();
                                onOpenChange(false);
                            }}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
