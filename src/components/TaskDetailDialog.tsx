import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChecklists } from "@/hooks/useChecklists";
import { useTaskAttachments, TaskAttachment } from "@/hooks/useTaskAttachments";
import { useBoardSharing } from "@/hooks/useBoardSharing";
import { useLabels } from "@/hooks/useLabels";
import { useProfile } from "@/hooks/useProfile";
import { Calendar, Trash2, Plus, X, CheckSquare, AlignLeft, Flag, CalendarDays, CircleCheck, CircleDashed, Paperclip, FileIcon, Download, Loader2, UserRound, ImageIcon, Tag, MessageSquare, Send, Pencil, Link2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";
import { taskService } from "@/services/taskService";
import { attachmentService } from "@/services/attachmentService";
import { useTaskComments, COMMENT_CATEGORIES, CommentCategory } from "@/hooks/useTaskComments";
import { useTaskLinks, LINK_TYPE_CONFIG, TaskLinkType } from "@/hooks/useTaskLinks";

const priorityConfig = {
    low: { label: "Low", className: "bg-priority-low/15 text-priority-low border-priority-low/30" },
    medium: { label: "Medium", className: "bg-priority-medium/15 text-priority-medium border-priority-medium/30" },
    high: { label: "High", className: "bg-priority-high/15 text-priority-high border-priority-high/30" },
} as const;

interface TaskDetailDialogProps {
    boardId: string;
    task: {
        id: string;
        title: string;
        description: string | null;
        priority: string;
        due_date: string | null;
        start_date?: string | null;
        is_done?: boolean;
        cover_image_url?: string | null;
        assigned_to?: string | null;
        assignee_profile?: { display_name: string | null; avatar_url: string | null } | null;
        task_labels?: Array<{ label_id: string; labels: { id: string; name: string; color: string } | null }>;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (updates: Record<string, unknown>) => void;
    onDelete: () => void;
    onMarkDone?: () => void;
    onMarkUndone?: () => void;
}

export function TaskDetailDialog({ boardId, task, open, onOpenChange, onUpdate, onDelete, onMarkDone, onMarkUndone }: TaskDetailDialogProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? "");
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [newChecklistItem, setNewChecklistItem] = useState("");
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Linked cards state
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [newLinkType, setNewLinkType] = useState<TaskLinkType>("relates_to");

    // Comments state
    const [newCommentContent, setNewCommentContent] = useState("");
    const [newCommentCategory, setNewCommentCategory] = useState<CommentCategory>("GENERAL_COMMENTS");
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentContent, setEditCommentContent] = useState("");
    const [editCommentCategory, setEditCommentCategory] = useState<CommentCategory>("GENERAL_COMMENTS");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const { items: checklistItems, createItem, updateItem, deleteItem } = useChecklists(task.id);
    const { attachments, uploadAttachment, deleteAttachment, isLoading: isLoadingAttachments } = useTaskAttachments(task.id);
    const { members } = useBoardSharing(boardId);
    const { labels: boardLabels, toggleTaskLabel } = useLabels(boardId);
    const { comments, isLoading: isLoadingComments, addComment, deleteComment, editComment } = useTaskComments(task.id);
    const { profile: currentProfile } = useProfile();
    const { links, isLoadingLinks, searchResults, isSearching, searchQuery: linkSearchQuery, setSearch: setLinkSearch, addLink, removeLink } = useTaskLinks(task.id, boardId);

    // Fetch current user id once on mount
    useEffect(() => {
        authService.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    }, []);

    // Build assignable list: always include the current user at the top,
    // followed by other board members (deduplicated).
    const assignableMembers = (() => {
        const list: Array<{ user_id: string; display_name: string | null; avatar_url: string | null }> = [];
        if (currentUserId && currentProfile) {
            list.push({
                user_id: currentUserId,
                display_name: currentProfile.display_name ?? null,
                avatar_url: currentProfile.avatar_url ?? null,
            });
        }
        for (const m of members) {
            if (m.user_id !== currentUserId) {
                list.push({ user_id: m.user_id, display_name: m.display_name, avatar_url: m.avatar_url });
            }
        }
        return list;
    })();

    const appliedLabelIds = new Set((task.task_labels ?? []).map((tl) => tl.label_id));

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

    const handleCoverUpload = useCallback(async (file: File) => {
        setIsUploadingCover(true);
        try {
            const publicUrl = await taskService.uploadTaskCover(task.id, file);
            onUpdate({ cover_image_url: publicUrl });
        } finally {
            setIsUploadingCover(false);
        }
    }, [task.id, onUpdate]);

    const handleRemoveCover = useCallback(() => {
        onUpdate({ cover_image_url: null });
    }, [onUpdate]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto p-0">
                {/* Cover image area */}
                {task.cover_image_url ? (
                    <div className="relative h-36 w-full min-w-0 overflow-hidden rounded-t-lg">
                        <img
                            src={task.cover_image_url}
                            alt="Card cover"
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute bottom-2 right-2 flex gap-1.5">
                            <div className="relative">
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) { handleCoverUpload(f); e.target.value = ""; }
                                    }}
                                    disabled={isUploadingCover}
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-7 text-xs bg-black/50 hover:bg-black/70 text-white border-0 backdrop-blur-sm"
                                    disabled={isUploadingCover}
                                >
                                    {isUploadingCover ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ImageIcon className="h-3 w-3 mr-1" />}
                                    Change
                                </Button>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs bg-black/50 hover:bg-black/70 text-white border-0 backdrop-blur-sm"
                                onClick={handleRemoveCover}
                            >
                                <X className="h-3 w-3 mr-1" /> Remove
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="relative flex min-w-0 items-center justify-center h-16 border-b bg-muted/30 overflow-hidden">
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) { handleCoverUpload(f); e.target.value = ""; }
                            }}
                            disabled={isUploadingCover}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground pointer-events-none"
                            disabled={isUploadingCover}
                        >
                            {isUploadingCover ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                            {isUploadingCover ? "Uploading cover..." : "Add a cover photo"}
                        </Button>
                    </div>
                )}

                <div className="min-w-0 overflow-hidden px-4 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6">
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
                                    "w-full break-words text-left text-lg font-semibold hover:bg-muted/50 rounded px-1 py-0.5 transition-colors",
                                    task.is_done && "line-through text-muted-foreground"
                                )}
                            >
                                {task.title}
                            </button>
                        )}
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Row 1: Mark Done + Priority */}
                        <div className="flex items-center gap-2">
                            {(onMarkDone || onMarkUndone) && (
                                <Button
                                    variant={task.is_done ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "shrink-0",
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
                            <div className="ml-auto flex items-center gap-1.5">
                                <Flag className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                        </div>

                        {/* Row 2: Dates — start + due */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {/* Start date */}
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-1 flex-col gap-0.5">
                                    <span className="text-[10px] font-medium text-muted-foreground leading-none">Start</span>
                                    <Input
                                        type="date"
                                        value={task.start_date ?? ""}
                                        onChange={(e) => onUpdate({ start_date: e.target.value || null })}
                                        className="h-8 w-full min-w-0"
                                    />
                                </div>
                            </div>
                            {/* Due date */}
                            <div className="flex items-center gap-2">
                                <CalendarDays className={cn(
                                    "h-4 w-4 shrink-0",
                                    isOverdue ? "text-destructive" : "text-muted-foreground"
                                )} />
                                <div className="flex flex-1 flex-col gap-0.5">
                                    <span className={cn("text-[10px] font-medium leading-none", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                        Due{isOverdue && " — Overdue"}
                                    </span>
                                    <Input
                                        type="date"
                                        value={task.due_date ?? ""}
                                        onChange={(e) => onUpdate({ due_date: e.target.value || null })}
                                        className={cn(
                                            "h-8 w-full min-w-0",
                                            isOverdue && "border-destructive text-destructive"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Assignee */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
                                <UserRound className="h-4 w-4" />
                                Assignee
                            </div>
                            <Select
                                value={task.assigned_to ?? "unassigned"}
                                onValueChange={(val) =>
                                    onUpdate({ assigned_to: val === "unassigned" ? null : val })
                                }
                            >
                                <SelectTrigger className="h-8 flex-1">
                                    <SelectValue>
                                        {task.assigned_to && task.assignee_profile ? (
                                            <span className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={task.assignee_profile.avatar_url ?? ""} />
                                                    <AvatarFallback className="text-[9px]">
                                                        {task.assignee_profile.display_name?.slice(0, 2).toUpperCase() ?? "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {task.assignee_profile.display_name ?? "Member"}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">Unassigned</span>
                                        )}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <UserRound className="h-4 w-4" />
                                            Unassigned
                                        </span>
                                    </SelectItem>
                                    {assignableMembers.map((m) => (
                                        <SelectItem key={m.user_id} value={m.user_id}>
                                            <span className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={m.avatar_url ?? ""} />
                                                    <AvatarFallback className="text-[9px]">
                                                        {m.display_name?.slice(0, 2).toUpperCase() ?? "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {m.display_name ?? "Unknown"}
                                                {m.user_id === currentUserId && (
                                                    <span className="ml-1 text-[10px] text-muted-foreground">(You)</span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Labels */}
                        {boardLabels.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Tag className="h-4 w-4" />
                                    Labels
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {boardLabels.map((label) => {
                                        const applied = appliedLabelIds.has(label.id);
                                        return (
                                            <button
                                                key={label.id}
                                                type="button"
                                                onClick={() =>
                                                    toggleTaskLabel.mutate({
                                                        taskId: task.id,
                                                        labelId: label.id,
                                                        attach: !applied,
                                                    })
                                                }
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                                                    "border focus:outline-none focus:ring-2 focus:ring-offset-1 hover:scale-105",
                                                    applied
                                                        ? "opacity-100 ring-1"
                                                        : "opacity-50 hover:opacity-80"
                                                )}
                                                style={{
                                                    backgroundColor: applied ? `${label.color}25` : "transparent",
                                                    borderColor: applied ? label.color : `${label.color}60`,
                                                    color: label.color,
                                                    ...(applied ? { ringColor: label.color } : {}),
                                                }}
                                                aria-pressed={applied}
                                                aria-label={`${applied ? "Remove" : "Add"} label: ${label.name}`}
                                            >
                                                <span
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: label.color }}
                                                />
                                                {label.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

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
                                    const publicUrl = attachmentService.getAttachmentPublicUrl(file.file_path);

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
                                            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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

                        {/* Linked Cards */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Link2 className="h-4 w-4" />
                                    Linked Cards
                                    {links.length > 0 && (
                                        <span className="ml-auto text-xs">{links.length}</span>
                                    )}
                                </div>
                            </div>

                            {isLoadingLinks && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Loading links...
                                </div>
                            )}

                            {links.length > 0 && (
                                <div className="space-y-1.5">
                                    {links.map((link) => {
                                        const cfg = LINK_TYPE_CONFIG[link.link_type];
                                        const t = link.target_task;
                                        const tPriority = t?.priority ? priorityConfig[t.priority as keyof typeof priorityConfig] : null;
                                        return (
                                            <div key={link.id} className="group flex items-center gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors">
                                                <Badge variant="outline" className={cn("shrink-0 text-[10px] px-1.5 py-0 font-medium", cfg.color)}>
                                                    {cfg.label}
                                                </Badge>
                                                <div className="flex-1 min-w-0">
                                                    <span className={cn("text-sm", t?.is_done && "line-through text-muted-foreground")}>
                                                        {t?.title ?? "(deleted)"}
                                                    </span>
                                                    {t?.column && (
                                                        <span className="ml-1.5 text-xs text-muted-foreground">{t.column.name}</span>
                                                    )}
                                                </div>
                                                {tPriority && (
                                                    <Badge variant="outline" className={cn("shrink-0 text-[10px] px-1.5 py-0", tPriority.className)}>
                                                        {tPriority.label}
                                                    </Badge>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                                    onClick={() => removeLink.mutate(link.id)}
                                                    disabled={removeLink.isPending}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {isAddingLink ? (
                                <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                                    <Select value={newLinkType} onValueChange={(v) => setNewLinkType(v as TaskLinkType)}>
                                        <SelectTrigger className="h-7 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(Object.entries(LINK_TYPE_CONFIG) as [TaskLinkType, typeof LINK_TYPE_CONFIG[TaskLinkType]][]).map(([type, cfg]) => (
                                                <SelectItem key={type} value={type}>
                                                    <span className={cn("text-xs", cfg.color)}>{cfg.label}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                        <Input
                                            value={linkSearchQuery}
                                            onChange={(e) => setLinkSearch(e.target.value)}
                                            placeholder="Search cards..."
                                            className="h-8 pl-7 text-sm"
                                            autoFocus
                                        />
                                        {isSearching && (
                                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground pointer-events-none" />
                                        )}
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="max-h-40 overflow-y-auto space-y-1 rounded border bg-background p-1">
                                            {searchResults.map((t) => (
                                                <button
                                                    type="button"
                                                    key={t.id}
                                                    className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted transition-colors text-left"
                                                    onClick={() => {
                                                        addLink.mutate(
                                                            { targetTaskId: t.id, linkType: newLinkType },
                                                            {
                                                                onSuccess: () => {
                                                                    setIsAddingLink(false);
                                                                    setLinkSearch("");
                                                                },
                                                            }
                                                        );
                                                    }}
                                                    disabled={addLink.isPending}
                                                >
                                                    <Badge variant="outline" className={cn("shrink-0 text-[10px] px-1 py-0", priorityConfig[t.priority as keyof typeof priorityConfig]?.className)}>
                                                        {t.priority[0].toUpperCase()}
                                                    </Badge>
                                                    <span className={cn("flex-1 truncate", t.is_done && "line-through text-muted-foreground")}>
                                                        {t.title}
                                                    </span>
                                                    <span className="shrink-0 text-xs text-muted-foreground">{t.column_name}</span>
                                                    {addLink.isPending && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {!isSearching && linkSearchQuery.trim() && searchResults.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-2">No matching cards found</p>
                                    )}

                                    <div className="flex justify-end">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => { setIsAddingLink(false); setLinkSearch(""); }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-muted-foreground"
                                    onClick={() => setIsAddingLink(true)}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add a link
                                </Button>
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
                                            className="h-6 w-6 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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

                        {/* Comments */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <MessageSquare className="h-4 w-4" />
                                Comments
                                {comments.length > 0 && (
                                    <span className="ml-auto text-xs">{comments.length}</span>
                                )}
                            </div>

                            {/* Existing comments */}
                            <div className="space-y-3">
                                {isLoadingComments && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Loading comments...
                                    </div>
                                )}
                                {comments.map((comment) => {
                                    const catConfig = COMMENT_CATEGORIES.find((c) => c.value === comment.category);
                                    const isEditing = editingCommentId === comment.id;
                                    const isOwn = comment.user_id === currentUserId;
                                    return (
                                        <div key={comment.id} className="group rounded-lg border bg-muted/30 p-3 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                    <Avatar className="h-6 w-6 shrink-0">
                                                        <AvatarImage src={comment.profile?.avatar_url ?? ""} />
                                                        <AvatarFallback className="text-[9px]">
                                                            {comment.profile?.display_name?.slice(0, 2).toUpperCase() ?? "?"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="truncate text-xs font-medium">
                                                        {comment.profile?.display_name ?? "Member"}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "shrink-0 text-[10px] px-1.5 py-0",
                                                            comment.category === "TASK_UPDATES" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                                                            comment.category === "QUESTIONS" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                                                            comment.category === "GENERAL_COMMENTS" && "bg-muted text-muted-foreground border-border"
                                                        )}
                                                    >
                                                        {catConfig?.label ?? comment.category}
                                                    </Badge>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-0.5">
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {new Date(comment.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                    {isOwn && !isEditing && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="p-1 rounded hover:bg-muted sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                                onClick={() => {
                                                                    setEditingCommentId(comment.id);
                                                                    setEditCommentContent(comment.content);
                                                                    setEditCommentCategory(comment.category);
                                                                }}
                                                                aria-label="Edit comment"
                                                            >
                                                                <Pencil className="h-3 w-3 text-muted-foreground" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="p-1 rounded hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                                onClick={() => deleteComment.mutate(comment.id)}
                                                                aria-label="Delete comment"
                                                            >
                                                                <Trash2 className="h-3 w-3 text-destructive" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <Select
                                                        value={editCommentCategory}
                                                        onValueChange={(v) => setEditCommentCategory(v as CommentCategory)}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {COMMENT_CATEGORIES.map((cat) => (
                                                                <SelectItem key={cat.value} value={cat.value}>
                                                                    <span className="text-xs">{cat.label}</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Textarea
                                                        value={editCommentContent}
                                                        onChange={(e) => setEditCommentContent(e.target.value)}
                                                        className="min-h-[60px] text-sm resize-none"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            disabled={editComment.isPending || !editCommentContent.trim()}
                                                            onClick={() => {
                                                                if (!editCommentContent.trim()) return;
                                                                editComment.mutate(
                                                                    { id: comment.id, content: editCommentContent.trim(), category: editCommentCategory },
                                                                    { onSuccess: () => setEditingCommentId(null) }
                                                                );
                                                            }}
                                                        >
                                                            {editComment.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingCommentId(null)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add new comment */}
                            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <Select
                                        value={newCommentCategory}
                                        onValueChange={(v) => setNewCommentCategory(v as CommentCategory)}
                                    >
                                        <SelectTrigger className="h-7 flex-1 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COMMENT_CATEGORIES.map((cat) => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium">{cat.label}</span>
                                                        <span className="text-[10px] text-muted-foreground">{cat.description}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Textarea
                                    value={newCommentContent}
                                    onChange={(e) => setNewCommentContent(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="min-h-[70px] resize-none text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            if (newCommentContent.trim()) {
                                                addComment.mutate(
                                                    { content: newCommentContent.trim(), category: newCommentCategory },
                                                    { onSuccess: () => setNewCommentContent("") }
                                                );
                                            }
                                        }
                                    }}
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">Ctrl+Enter to send</span>
                                    <Button
                                        size="sm"
                                        disabled={addComment.isPending || !newCommentContent.trim()}
                                        onClick={() => {
                                            if (!newCommentContent.trim()) return;
                                            addComment.mutate(
                                                { content: newCommentContent.trim(), category: newCommentCategory },
                                                { onSuccess: () => setNewCommentContent("") }
                                            );
                                        }}
                                    >
                                        {addComment.isPending ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        ) : (
                                            <Send className="h-3 w-3 mr-1" />
                                        )}
                                        Comment
                                    </Button>
                                </div>
                            </div>
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
