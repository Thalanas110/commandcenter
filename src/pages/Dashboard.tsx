import { useState } from "react";
import { useBoards } from "@/hooks/useBoards";
import { AppHeader } from "@/components/AppHeader";
import { BoardCard } from "@/components/BoardCard";
import { CreateBoardDialog } from "@/components/CreateBoardDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  const { boards, isLoading, createBoard, deleteBoard, updateBoard } = useBoards();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-4 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-4 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your Boards</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Manage and organize your projects</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Board
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <LayoutDashboard className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No boards yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first board to get started</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Create Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onDelete={() => deleteBoard.mutate(board.id)}
                onRename={(name) => updateBoard.mutate({ id: board.id, name })}
              />
            ))}
          </div>
        )}

        <CreateBoardDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreateBoard={(name) => {
            createBoard.mutate(name);
            setCreateOpen(false);
          }}
        />
      </main>
    </div>
  );
}
