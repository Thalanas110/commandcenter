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
import { useTaskAttachments, TaskAttachment } from "@/hooks/useTaskAttachments";
import { Calendar, Trash2, Plus, X, CheckSquare, AlignLeft, Flag, CalendarDays, CircleCheck, CircleDashed, Paperclip, FileIcon, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
        is_done?: boolean;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (updates: Record<string, unknown>) => void;
    onDelete: () => void;
    onMarkDone?: () => void;
    onMarkUndone?: () => void;
}

export function TaskDetailDialog({ task, open, onOpenChange, onUpdate, onDelete, onMarkDone, onMarkUndone }: TaskDetailDialogProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? "");
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [newChecklistItem, setNewChecklistItem] = useState("");
    const [isAddingItem, setIsAddingItem] = useState(false);
    const fileInputRef = useState<HTMLInputElement | null>(null);

    const { items: checklistItems, createItem, updateItem, deleteItem } = useChecklists(task.id);
    const { attachments, uploadAttachment, deleteAttachment, isLoading: isLoadingAttachments } = useTaskAttachments(task.id);

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
                            className={cn(
                                "w-full text-left text-lg font-semibold hover:bg-muted/50 rounded px-1 py-0.5 transition-colors",
                                task.is_done && "line-through text-muted-foreground"
                            )}
                        >
                            {task.title}
                        </button>
                    )}
                </DialogHeader>

                <div className="space-y-5">
                    {/* Done status + Priority & Due Date row */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Mark as Done / Undo Done button */}
                        {(onMarkDone || onMarkUndone) && (
                            <Button
                                variant={task.is_done ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                    task.is_done && "bg-priority-low hover:bg-priority-low/90"
                                )}
                                onClick={() => {
                                    if (task.is_done) {
                                        onMarkUndone?.();
                                    } else {
                                        onMarkDone?.();
                                    }
                                }}
                            >
                                {task.is_done ? (
                                    <><CircleCheck className="mr-1 h-4 w-4" /> Done</>
                                ) : (
                                    <><CircleDashed className="mr-1 h-4 w-4" /> Mark Done</>
                                )}
                            </Button>
                        )}

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
                            <CalendarDays className={cn(
                                "h-4 w-4",
                                isOverdue ? "text-destructive" : "text-muted-foreground"
                            )} />
                            <Input
                                type="date"
                                value={task.due_date ?? ""}
                                onChange={(e) => onUpdate({ due_date: e.target.value || null })}
                                className={cn(
                                    "h-8 w-40",
                                    isOverdue && "border-destructive text-destructive"
                                )}
                            />
                            {isOverdue && (
                                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                                    Overdue
                                </Badge>
                            )}
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

                    {/* Attachments */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Paperclip className="h-4 w-4" />
                                Attachments
                            </div>
                        </div>

                        <div className="grid gap-2">
                            {isLoadingAttachments && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Loading attachments...
                                </div>
                            )}

                            {attachments.map((file) => {
                                const isImage = file.file_type.startsWith("image/");
                                const publicUrl = supabase.storage.from("task-attachments").getPublicUrl(file.file_path).data.publicUrl;

                                return (
                                    <div key={file.id} className="group flex items-center justify-between rounded-md border p-2 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {isImage ? (
                                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                                                    <img src={publicUrl} alt={file.file_name} className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                                                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="flex flex-col overflow-hidden">
                                                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium hover:underline">
                                                    {file.file_name}
                                                </a>
                                                <span className="text-xs text-muted-foreground">
                                                    {(file.file_size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={publicUrl} download={file.file_name} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </a>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => deleteAttachment.mutate(file)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="relative">
                            <Input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        uploadAttachment.mutate(file);
                                        e.target.value = ""; // Reset value
                                    }
                                }}
                                disabled={uploadAttachment.isPending}
                            />
                            <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground" disabled={uploadAttachment.isPending}>
                                {uploadAttachment.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="mr-2 h-4 w-4" />
                                )}
                                {uploadAttachment.isPending ? "Uploading..." : "Add Attachment"}
                            </Button>
                        </div>
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
