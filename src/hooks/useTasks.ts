import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/services/taskService";
import { adminService } from "@/services/adminService";
import { useAuth } from "./useAuth";

interface AssigneeProfile {
  display_name: string | null;
  avatar_url: string | null;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  start_date: string | null;
  column_id: string;
  order_index: number;
  is_done?: boolean;
  cover_image_url?: string | null;
  assigned_to?: string | null;
  assignee_profile?: AssigneeProfile | null;
  task_labels?: Array<{ label_id: string; labels: { id: string; name: string; color: string } | null }>;
  task_attachments?: { count: number }[];
}

interface MarkDoneInput {
  taskId: string;
  targetColumnId: string;
  targetOrderIndex: number;
}

interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string;
  priority: "low" | "medium" | "high";
  column_id: string;
}

interface MoveTaskInput {
  taskId: string;
  newColumnId: string;
  newOrderIndex: number;
}

export function useTasks(boardId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["tasks", boardId],
    queryFn: async () => {
      if (!boardId) return [];
      return taskService.getTasksByBoard(boardId);
    },
    enabled: !!boardId && !!user,
  });

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const nextOrder = await taskService.getNextOrderIndex(input.column_id);
      await taskService.createTask({ ...input, order_index: nextOrder });
      if (user) {
        await adminService.logActivity(user.id, "created", "task", undefined, { title: input.title });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateTaskInput>) => {
      await taskService.updateTask(id, updates as Record<string, unknown>);
      if (user) {
        await adminService.logActivity(user.id, "updated", "task", id, updates as Record<string, unknown>);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      await taskService.deleteTask(id);
      if (user) {
        await adminService.logActivity(user.id, "deleted", "task", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const moveTask = useMutation({
    mutationFn: async ({ taskId, newColumnId, newOrderIndex }: MoveTaskInput) => {
      await taskService.moveTask(taskId, newColumnId, newOrderIndex);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const markDone = useMutation({
    mutationFn: async ({ taskId, targetColumnId, targetOrderIndex }: MarkDoneInput) => {
      await taskService.markTaskDone(taskId, targetColumnId, targetOrderIndex);
      if (user) {
        await adminService.logActivity(user.id, "marked_done", "task", taskId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const markUndone = useMutation({
    mutationFn: async (taskId: string) => {
      await taskService.markTaskUndone(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    markDone,
    markUndone,
  };
}
