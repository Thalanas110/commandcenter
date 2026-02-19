import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { useLabels, type BoardLabel } from "@/hooks/useLabels";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#6366f1", // indigo
    "#64748b", // slate
];

interface LabelManagerDialogProps {
    boardId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function LabelRow({
    label,
    onUpdate,
    onDelete,
}: {
    label: BoardLabel;
    onUpdate: (id: string, name: string, color: string) => void;
    onDelete: (id: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(label.name);
    const [editColor, setEditColor] = useState(label.color);

    const handleSave = () => {
        const trimmed = editName.trim();
        if (!trimmed) return;
        onUpdate(label.id, trimmed, editColor);
        setEditing(false);
    };

    const handleCancel = () => {
        setEditName(label.name);
        setEditColor(label.color);
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                        if (e.key === "Escape") handleCancel();
                    }}
                    placeholder="Label name..."
                    autoFocus
                    className="h-8"
                />
                <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={cn(
                                "h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1",
                                editColor === c && "ring-2 ring-offset-1 ring-foreground scale-110"
                            )}
                            style={{ backgroundColor: c }}
                            onClick={() => setEditColor(c)}
                            aria-label={`Pick color ${c}`}
                        >
                            {editColor === c && <Check className="h-3 w-3 text-white mx-auto" />}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={!editName.trim()}>
                        Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/40 transition-colors">
            <div
                className="h-5 w-5 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
            />
            <span className="flex-1 text-sm font-medium">{label.name}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                        setEditName(label.name);
                        setEditColor(label.color);
                        setEditing(true);
                    }}
                >
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(label.id)}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

export function LabelManagerDialog({ boardId, open, onOpenChange }: LabelManagerDialogProps) {
    const { labels, isLoading, createLabel, updateLabel, deleteLabel } = useLabels(boardId);

    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

    const handleCreate = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        createLabel.mutate(
            { name: trimmed, color: newColor },
            {
                onSuccess: () => {
                    setNewName("");
                    setNewColor(PRESET_COLORS[0]);
                    setIsCreating(false);
                },
            }
        );
    };

    const handleCancelCreate = () => {
        setNewName("");
        setNewColor(PRESET_COLORS[0]);
        setIsCreating(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Board Labels</DialogTitle>
                    <DialogDescription>
                        Create and manage custom labels to categorize your cards.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {isLoading && (
                        <p className="text-sm text-muted-foreground text-center py-4">Loading labels…</p>
                    )}
                    {!isLoading && labels.length === 0 && !isCreating && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No labels yet. Create your first one!
                        </p>
                    )}
                    {labels.map((label) => (
                        <LabelRow
                            key={label.id}
                            label={label}
                            onUpdate={(id, name, color) => updateLabel.mutate({ id, name, color })}
                            onDelete={(id) => deleteLabel.mutate(id)}
                        />
                    ))}
                </div>

                {isCreating ? (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate();
                                if (e.key === "Escape") handleCancelCreate();
                            }}
                            placeholder="Label name (e.g. Thesis Writing)"
                            autoFocus
                            className="h-8"
                        />
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={cn(
                                        "h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1",
                                        newColor === c && "ring-2 ring-offset-1 ring-foreground scale-110"
                                    )}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setNewColor(c)}
                                    aria-label={`Pick color ${c}`}
                                >
                                    {newColor === c && <Check className="h-3 w-3 text-white mx-auto" />}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleCreate}
                                disabled={!newName.trim() || createLabel.isPending}
                            >
                                {createLabel.isPending ? "Creating…" : "Create"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelCreate}>
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setIsCreating(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Label
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}
