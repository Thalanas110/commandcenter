import { useRef, useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useColumns } from "@/hooks/useColumns";
import { useTasks } from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";
import { useAutoMoveCards } from "@/hooks/useAutoMoveCards";
import { useRealtimeBoard } from "@/hooks/useRealtime";
import { AppHeader } from "@/components/AppHeader";
import { KanbanColumn } from "@/components/KanbanColumn";
import { TaskCard } from "@/components/TaskCard";
import { CategoryHeader } from "@/components/CategoryHeader";
import { CategoryManagerDialog } from "@/components/CategoryManagerDialog";
import { LabelManagerDialog } from "@/components/LabelManagerDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardShareDialog } from "@/components/BoardShareDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ArrowLeft,
  ImagePlus,
  ImageOff,
  Wallpaper,
  Tags,
  MoreHorizontal,
} from "lucide-react";
import { useBoards } from "@/hooks/useBoards";
import { useBoardSharing } from "@/hooks/useBoardSharing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


function BoardMembersList({ boardId }: { boardId: string }) {
  const { members } = useBoardSharing(boardId);

  if (members.length === 0) return null;

  const displayMembers = members.slice(0, 4);
  const remaining = members.length - 4;

  return (
    <div className="flex items-center -space-x-2 mr-2">
      {displayMembers.map((member) => (
        <Avatar key={member.user_id} className="h-8 w-8 border-2 border-background">
          <AvatarImage src={member.avatar_url || ""} />
          <AvatarFallback className="text-[10px] bg-primary/10">
            {member.display_name?.slice(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default function BoardViewPage() {
  const { id: boardId } = useParams<{ id: string }>();
  const { boards, uploadBoardBackground, removeBoardBackground } = useBoards();
  const board = boards.find((b) => b.id === boardId);
  const {
    columns,
    isLoading: colLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    uploadColumnCover,
    removeColumnCover,
  } = useColumns(boardId);
  const {
    tasks,
    isLoading: taskLoading,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    markDone,
    markUndone,
  } = useTasks(boardId);
  const {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories(boardId);
  useRealtimeBoard(boardId);

  // Auto-move overdue → On Hold, done → Done
  useAutoMoveCards(tasks, columns, tasks, moveTask, colLoading || taskLoading);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"column" | "task" | null>(null);
  const activeTask =
    activeType === "task" ? tasks.find((t) => t.id === activeId) : undefined;
  const activeColumn =
    activeType === "column"
      ? columns.find((c) => c.id === activeId)
      : undefined;
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);

  // On desktop, redirect vertical wheel scroll to horizontal so users can
  // scroll through columns with a normal mouse wheel.
  useEffect(() => {
    const el = boardScrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      // Shift+scroll → horizontal; plain scroll → vertical (default)
      if (e.shiftKey && e.deltaY !== 0) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const type =
      event.active.data.current?.type === "column" ? "column" : "task";
    setActiveId(event.active.id as string);
    setActiveType(type);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Handle cross-column dragging via optimistic UI if needed
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);
    if (!over) return;

    // --- Column reordering ---
    if (activeType === "column") {
      if (active.id !== over.id) {
        const oldIndex = columns.findIndex((c) => c.id === active.id);
        const newIndex = columns.findIndex((c) => c.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(columns, oldIndex, newIndex).map(
            (c) => c.id
          );
          reorderColumns.mutate(newOrder);
        }
      }
      return;
    }

    // --- Task reordering / moving ---
    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped over a column
    const targetColumn = columns.find((c) => c.id === overId);
    if (targetColumn) {
      const tasksInCol = tasks.filter(
        (t) => t.column_id === targetColumn.id
      );
      moveTask.mutate({
        taskId,
        newColumnId: targetColumn.id,
        newOrderIndex: tasksInCol.length,
      });
      return;
    }

    // Dropped over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      moveTask.mutate({
        taskId,
        newColumnId: overTask.column_id,
        newOrderIndex: overTask.order_index,
      });
    }
  };

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && boardId) {
      uploadBoardBackground.mutate({ boardId, file });
    }
    e.target.value = "";
  };

  const backgroundUrl = board?.background_image_url;

  const boardAreaStyle = useMemo(
    () =>
      backgroundUrl
        ? {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: "cover" as const,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat" as const,
        }
        : undefined,
    [backgroundUrl]
  );

  // Group columns by category
  const groupedColumns = useMemo(() => {
    const groups: {
      category: (typeof categories)[number] | null;
      columns: typeof columns;
    }[] = [];

    // Add category groups in order
    for (const cat of categories) {
      groups.push({
        category: cat,
        columns: columns.filter((c) => c.category_id === cat.id),
      });
    }

    // Add uncategorized columns
    const uncategorized = columns.filter(
      (c) => !c.category_id || !categories.some((cat) => cat.id === c.category_id)
    );
    if (uncategorized.length > 0) {
      groups.push({ category: null, columns: uncategorized });
    }

    return groups;
  }, [columns, categories]);

  const isLoading = colLoading || taskLoading;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background" style={boardAreaStyle}>
      {/* Dark overlay for readability when background image is set */}
      {backgroundUrl && (
        <div className="pointer-events-none absolute inset-0 bg-black/20" />
      )}
      <AppHeader />
      <div
        className={`border-b ${backgroundUrl ? "bg-card/80 backdrop-blur-sm" : "bg-card"}`}
      >
        <div className="container flex h-12 items-center gap-2 sm:gap-3">
          {/* Back button */}
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          {/* Board title */}
          <h1 className="min-w-0 flex-1 truncate text-base font-bold sm:flex-none sm:text-xl">
            {board?.name ?? "Board"}
          </h1>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Member Avatars — hide on very small screens */}
            <div className="hidden sm:flex">
              {boardId && <BoardMembersList boardId={boardId} />}
            </div>

            {/* Share button — always visible */}
            {boardId && <BoardShareDialog boardId={boardId} />}

            {/* Hidden file input for background */}
            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBgFileChange}
            />

            {/* ── Desktop action bar (md+) ── */}
            <div className="hidden md:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Wallpaper className="mr-1 h-4 w-4" /> Background
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => bgFileInputRef.current?.click()}>
                    <ImagePlus className="mr-2 h-3.5 w-3.5" /> Set Background
                  </DropdownMenuItem>
                  {backgroundUrl && (
                    <DropdownMenuItem
                      onClick={() =>
                        boardId &&
                        removeBoardBackground.mutate({ boardId, currentUrl: backgroundUrl })
                      }
                    >
                      <ImageOff className="mr-2 h-3.5 w-3.5" /> Remove Background
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {boardId && (
                <Button variant="outline" size="sm" onClick={() => setLabelDialogOpen(true)}>
                  <Tags className="mr-1 h-4 w-4" /> Labels
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)}>
                <Tags className="mr-1 h-4 w-4" /> Categories
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => boardId && createColumn.mutate({ name: "New Column", boardId })}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Column
              </Button>
            </div>

            {/* ── Mobile overflow menu (hidden on md+) ── */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => bgFileInputRef.current?.click()}>
                    <ImagePlus className="mr-2 h-4 w-4" /> Set Background
                  </DropdownMenuItem>
                  {backgroundUrl && (
                    <DropdownMenuItem
                      onClick={() =>
                        boardId &&
                        removeBoardBackground.mutate({ boardId, currentUrl: backgroundUrl })
                      }
                    >
                      <ImageOff className="mr-2 h-4 w-4" /> Remove Background
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {boardId && (
                    <DropdownMenuItem onClick={() => setLabelDialogOpen(true)}>
                      <Tags className="mr-2 h-4 w-4" /> Labels
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setCategoryDialogOpen(true)}>
                    <Tags className="mr-2 h-4 w-4" /> Categories
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => boardId && createColumn.mutate({ name: "New Column", boardId })}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Column
                  </DropdownMenuItem>
                  {/* Member avatars shown in mobile menu header */}
                  {boardId && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1">
                        <BoardMembersList boardId={boardId} />
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={boardScrollRef}
        className="relative min-h-0 flex-1 overflow-x-auto overflow-y-auto p-2 sm:p-4"
      >
        <div className="relative">
          {isLoading ? (
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-lg" />
              ))}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="space-y-2 sm:space-y-4">
                  {groupedColumns.map((group) => {
                    const isCollapsed = group.category
                      ? collapsedCategories[group.category.id] ?? false
                      : false;

                    return (
                      <div
                        key={group.category?.id ?? "uncategorized"}
                      >
                        {/* Category header */}
                        {group.category ? (
                          <div className="sticky left-0 z-10 bg-background/90 backdrop-blur-sm">
                            <CategoryHeader
                              category={group.category}
                              columnCount={group.columns.length}
                              isCollapsed={isCollapsed}
                              onToggleCollapse={() =>
                                group.category && toggleCategory(group.category.id)
                              }
                              onRename={(name) =>
                                group.category &&
                                updateCategory.mutate({
                                  id: group.category.id,
                                  name,
                                })
                              }
                              onChangeColor={(color) =>
                                group.category &&
                                updateCategory.mutate({
                                  id: group.category.id,
                                  color,
                                })
                              }
                              onDelete={() =>
                                group.category &&
                                deleteCategory.mutate(group.category.id)
                              }
                            />
                          </div>
                        ) : categories.length > 0 ? (
                          <div className="sticky left-0 z-10 mb-2 flex items-center gap-2 bg-background/90 backdrop-blur-sm">
                            <div className="h-6 w-1 shrink-0 rounded-full bg-muted-foreground/30" />
                            <span className="text-sm font-semibold text-muted-foreground">
                              Uncategorized
                              <span className="ml-2 text-xs font-normal">
                                {group.columns.length}{" "}
                                {group.columns.length === 1 ? "list" : "lists"}
                              </span>
                            </span>
                          </div>
                        ) : null}

                        {/* Columns row */}
                        {!isCollapsed && (
                          <div className="flex gap-2 sm:gap-4">
                            {group.columns.map((column) => (
                              <KanbanColumn
                                key={column.id}
                                boardId={boardId!}
                                column={column}
                                tasks={tasks.filter(
                                  (t) => t.column_id === column.id
                                )}
                                onRename={(name) =>
                                  updateColumn.mutate({
                                    id: column.id,
                                    name,
                                  })
                                }
                                onDelete={() =>
                                  deleteColumn.mutate(column.id)
                                }
                                onCreateTask={(title) =>
                                  createTask.mutate({
                                    title,
                                    priority: "medium",
                                    column_id: column.id,
                                  })
                                }
                                onUpdateTask={(id, updates) =>
                                  updateTask.mutate({ id, ...updates })
                                }
                                onDeleteTask={(id) =>
                                  deleteTask.mutate(id)
                                }
                                onUploadCover={(file) =>
                                  uploadColumnCover.mutate({
                                    columnId: column.id,
                                    file,
                                  })
                                }
                                onRemoveCover={() =>
                                  column.cover_image_url &&
                                  removeColumnCover.mutate({
                                    columnId: column.id,
                                    currentUrl: column.cover_image_url,
                                  })
                                }
                                categories={categories}
                                onChangeCategory={(categoryId) =>
                                  updateColumn.mutate({
                                    id: column.id,
                                    category_id: categoryId,
                                  })
                                }
                                onMarkDone={(taskId) => {
                                  // Find the "Done" column in the same category
                                  const doneCol = columns.find(
                                    (c) =>
                                      c.category_id === column.category_id &&
                                      c.name.toLowerCase().trim() === "done"
                                  );
                                  if (doneCol) {
                                    const tasksInDone = tasks.filter(
                                      (t) => t.column_id === doneCol.id
                                    );
                                    markDone.mutate({
                                      taskId,
                                      targetColumnId: doneCol.id,
                                      targetOrderIndex: tasksInDone.length,
                                    });
                                  } else {
                                    // No Done column found — just mark is_done without moving
                                    updateTask.mutate({ id: taskId, is_done: true } as never);
                                  }
                                }}
                                onMarkUndone={(taskId) => {
                                  markUndone.mutate(taskId);
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeTask ? (
                  <TaskCard boardId={boardId!} task={activeTask} isDragging />
                ) : null}
                {activeColumn ? (
                  <div className="flex h-32 w-72 items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-primary/5">
                    <span className="font-semibold text-primary/60">
                      {activeColumn.name}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* Label Manager Dialog */}
      {boardId && (
        <LabelManagerDialog
          boardId={boardId}
          open={labelDialogOpen}
          onOpenChange={setLabelDialogOpen}
        />
      )}

      {/* Category Manager Dialog */}
      <CategoryManagerDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        categories={categories}
        onCreateCategory={(name, color) =>
          createCategory.mutate({ name, color })
        }
        onDeleteCategory={(id) => deleteCategory.mutate(id)}
      />
    </div>
  );
}
