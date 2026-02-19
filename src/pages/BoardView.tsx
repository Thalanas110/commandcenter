import { useState } from "react";
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
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useColumns } from "@/hooks/useColumns";
import { useTasks } from "@/hooks/useTasks";
import { useRealtimeBoard } from "@/hooks/useRealtime";
import { AppHeader } from "@/components/AppHeader";
import { KanbanColumn } from "@/components/KanbanColumn";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowLeft } from "lucide-react";
import { useBoards } from "@/hooks/useBoards";

export default function BoardViewPage() {
  const { id: boardId } = useParams<{ id: string }>();
  const { boards } = useBoards();
  const board = boards.find((b) => b.id === boardId);
  const { columns, isLoading: colLoading, createColumn, updateColumn, deleteColumn, reorderColumns, uploadColumnCover, removeColumnCover } = useColumns(boardId);
  const { tasks, isLoading: taskLoading, createTask, updateTask, deleteTask, moveTask } = useTasks(boardId);
  useRealtimeBoard(boardId);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle cross-column dragging via optimistic UI if needed
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped over a column
    const targetColumn = columns.find((c) => c.id === overId);
    if (targetColumn) {
      const tasksInCol = tasks.filter((t) => t.column_id === targetColumn.id);
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

  const isLoading = colLoading || taskLoading;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <div className="border-b bg-card px-4 py-3">
        <div className="container flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-xl font-bold">{board?.name ?? "Board"}</h1>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => boardId && createColumn.mutate({ name: "New Column", boardId })}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Column
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
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
            <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-4">
                {columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={tasks.filter((t) => t.column_id === column.id)}
                    onRename={(name) => updateColumn.mutate({ id: column.id, name })}
                    onDelete={() => deleteColumn.mutate(column.id)}
                    onCreateTask={(title) =>
                      createTask.mutate({
                        title,
                        priority: "medium",
                        column_id: column.id,
                      })
                    }
                    onUpdateTask={(id, updates) => updateTask.mutate({ id, ...updates })}
                    onDeleteTask={(id) => deleteTask.mutate(id)}
                    onUploadCover={(file) => uploadColumnCover.mutate({ columnId: column.id, file })}
                    onRemoveCover={() => column.cover_image_url && removeColumnCover.mutate({ columnId: column.id, currentUrl: column.cover_image_url })}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
