import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ChevronDown,
    ChevronRight,
    MoreHorizontal,
    Pencil,
    Trash2,
    Palette,
} from "lucide-react";
import type { Category } from "@/hooks/useCategories";

const PRESET_COLORS = [
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#6b7280", // gray
];

interface CategoryHeaderProps {
    category: Category;
    columnCount: number;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onRename: (name: string) => void;
    onChangeColor: (color: string) => void;
    onDelete: () => void;
}

export function CategoryHeader({
    category,
    columnCount,
    isCollapsed,
    onToggleCollapse,
    onRename,
    onChangeColor,
    onDelete,
}: CategoryHeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(category.name);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const handleRename = () => {
        if (editName.trim() && editName !== category.name) {
            onRename(editName.trim());
        }
        setIsEditing(false);
    };

    return (
        <div className="mb-2 flex w-full shrink-0 items-center gap-2">
            {/* Colored accent bar */}
            <div
                className="h-6 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
            />

            {/* Collapse toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={onToggleCollapse}
            >
                {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                ) : (
                    <ChevronDown className="h-4 w-4" />
                )}
            </Button>

            {/* Category name */}
            {isEditing ? (
                <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => e.key === "Enter" && handleRename()}
                    autoFocus
                    className="h-7 w-48 text-sm font-semibold"
                />
            ) : (
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                    {category.name}
                    <span className="text-xs font-normal text-muted-foreground">
                        {columnCount} {columnCount === 1 ? "list" : "lists"}
                    </span>
                </button>
            )}

            {/* Actions */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-auto h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => {
                            setIsEditing(true);
                            setEditName(category.name);
                        }}
                    >
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowColorPicker((p) => !p)}>
                        <Palette className="mr-2 h-3.5 w-3.5" /> Change Color
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Color picker popover (inline for simplicity) */}
            {showColorPicker && (
                <div className="absolute top-full z-50 mt-1 flex flex-wrap gap-1.5 rounded-lg border bg-popover p-2 shadow-lg">
                    {PRESET_COLORS.map((color) => (
                        <button
                            type="button"
                            key={color}
                            className="h-6 w-6 rounded-full ring-offset-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                                onChangeColor(color);
                                setShowColorPicker(false);
                            }}
                            aria-label={`Select color ${color}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
