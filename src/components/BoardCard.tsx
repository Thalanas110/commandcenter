import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, ArrowRight } from "lucide-react";

interface BoardCardProps {
  board: { id: string; name: string; created_at: string; background_image_url?: string | null };
  onDelete: () => void;
  onRename: (name: string) => void;
}

export function BoardCard({ board, onDelete, onRename }: BoardCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(board.name);

  const handleRename = () => {
    if (editName.trim() && editName !== board.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      {/* Background image thumbnail */}
      {board.background_image_url && (
        <div className="h-24 w-full overflow-hidden">
          <img
            src={board.background_image_url}
            alt={`${board.name} background`}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
              className="h-8 text-lg font-semibold"
            />
          ) : (
            <CardTitle className="text-lg">{board.name}</CardTitle>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setIsEditing(true); setEditName(board.name); }}>
                <Pencil className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>
          Created {new Date(board.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="ghost" size="sm" asChild className="ml-auto">
          <Link to={`/board/${board.id}`}>
            Open <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

