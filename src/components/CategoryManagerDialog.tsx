import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import type { Category } from "@/hooks/useCategories";

const PRESET_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6b7280",
];

interface CategoryManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
    onCreateCategory: (name: string, color: string) => void;
    onDeleteCategory: (id: string) => void;
}

export function CategoryManagerDialog({
    open,
    onOpenChange,
    categories,
    onCreateCategory,
    onDeleteCategory,
}: CategoryManagerDialogProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState(PRESET_COLORS[0]);

    const handleCreate = () => {
        if (!name.trim()) return;
        onCreateCategory(name.trim(), color);
        setName("");
        setColor(PRESET_COLORS[0]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                </DialogHeader>

                {/* Create form */}
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="cat-name">Category Name</Label>
                        <Input
                            id="cat-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            placeholder="e.g. Sprint 1, Feature Work…"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Color</Label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    type="button"
                                    key={c}
                                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${c === color
                                            ? "ring-2 ring-ring ring-offset-2"
                                            : ""
                                        }`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                    aria-label={`Select color ${c}`}
                                />
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleCreate} disabled={!name.trim()} className="w-full">
                        Create Category
                    </Button>
                </div>

                {/* Existing categories */}
                {categories.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <Label>Existing Categories</Label>
                        <div className="max-h-48 space-y-1.5 overflow-y-auto">
                            {categories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="flex items-center gap-2 rounded-md border px-3 py-2"
                                >
                                    <div
                                        className="h-4 w-4 shrink-0 rounded-full"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                    <span className="flex-1 truncate text-sm font-medium">
                                        {cat.name}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => onDeleteCategory(cat.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
