import { useRef, useState } from "react";
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
import { Trash2, Clock } from "lucide-react";
import type { Category } from "@/hooks/useCategories";

interface CategoryManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
    onCreateCategory: (name: string, color: string) => void;
    onDeleteCategory: (id: string) => void;
    onUpdateCategory: (id: string, fields: Partial<{ name: string; color: string; auto_delete_after_weeks: number | null }>) => void;
}

export function CategoryManagerDialog({
    open,
    onOpenChange,
    categories,
    onCreateCategory,
    onDeleteCategory,
    onUpdateCategory,
}: CategoryManagerDialogProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#6366f1");
    const colorInputRef = useRef<HTMLInputElement>(null);

    const handleCreate = () => {
        if (!name.trim()) return;
        onCreateCategory(name.trim(), color);
        setName("");
        setColor("#6366f1");
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
                        <div className="flex items-center gap-3">
                            {/* Clickable swatch that opens the native color picker */}
                            <button
                                type="button"
                                className="h-8 w-8 rounded-full border-2 border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                style={{ backgroundColor: color }}
                                onClick={() => colorInputRef.current?.click()}
                                aria-label="Pick color"
                            />
                            <input
                                ref={colorInputRef}
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="sr-only"
                                tabIndex={-1}
                            />
                            <span className="text-sm font-mono text-muted-foreground">{color}</span>
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
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                            {categories.map((cat) => (
                                <CategoryRow
                                    key={cat.id}
                                    category={cat}
                                    onDelete={() => onDeleteCategory(cat.id)}
                                    onUpdate={(fields) => onUpdateCategory(cat.id, fields)}
                                />
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

// ─── Per-category row with inline auto-delete setting ────────────────────────

interface CategoryRowProps {
    category: Category;
    onDelete: () => void;
    onUpdate: (fields: Partial<{ name: string; color: string; auto_delete_after_weeks: number | null }>) => void;
}

function CategoryRow({ category, onDelete, onUpdate }: CategoryRowProps) {
    const [weeksInput, setWeeksInput] = useState(
        category.auto_delete_after_weeks != null
            ? String(category.auto_delete_after_weeks)
            : ""
    );
    const [uncommitted, setUncommitted] = useState(false);
    const rowColorRef = useRef<HTMLInputElement>(null);

    const handleWeeksBlur = () => {
        if (!uncommitted) return;
        const parsed = parseInt(weeksInput, 10);
        const newVal = !isNaN(parsed) && parsed > 0 ? parsed : null;
        onUpdate({ auto_delete_after_weeks: newVal });
        // Normalise input display
        setWeeksInput(newVal != null ? String(newVal) : "");
        setUncommitted(false);
    };

    const handleWeeksKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className="space-y-1.5 rounded-md border px-3 py-2">
            {/* Name + color dot + delete */}
            <div className="flex items-center gap-2">
                {/* Clickable color swatch – opens native full color picker */}
                <button
                    type="button"
                    className="h-5 w-5 shrink-0 rounded-full border border-border/60 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    style={{ backgroundColor: category.color }}
                    onClick={() => rowColorRef.current?.click()}
                    title="Change color"
                />
                <input
                    ref={rowColorRef}
                    type="color"
                    defaultValue={category.color}
                    onChange={(e) => onUpdate({ color: e.target.value })}
                    className="sr-only"
                    tabIndex={-1}
                />
                <span className="flex-1 truncate text-sm font-medium">
                    {category.name}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={onDelete}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Auto-delete setting */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="shrink-0">Auto-delete Done cards after</span>
                <Input
                    type="number"
                    min={1}
                    className="h-6 w-16 px-1.5 text-xs"
                    placeholder="—"
                    value={weeksInput}
                    onChange={(e) => {
                        setWeeksInput(e.target.value);
                        setUncommitted(true);
                    }}
                    onBlur={handleWeeksBlur}
                    onKeyDown={handleWeeksKeyDown}
                />
                <span className="shrink-0">
                    {weeksInput && !isNaN(parseInt(weeksInput)) && parseInt(weeksInput) > 0
                        ? parseInt(weeksInput) === 1 ? "week" : "weeks"
                        : "(off)"}
                </span>
            </div>
        </div>
    );
}

