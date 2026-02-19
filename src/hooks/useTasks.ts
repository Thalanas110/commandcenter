import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  column_id: string;
  order_index: number;
  is_done?: boolean;
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
      const { data: columns } = await supabase
        .from("columns")
        .select("id")
        .eq("board_id", boardId);
      if (!columns?.length) return [];

      const columnIds = columns.map((c) => c.id);
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          task_labels (
            label_id,
            labels (*)
          ),
          task_attachments (count),
          assignee_profile:profiles!tasks_assigned_to_fkey (
            display_name,
            avatar_url
          )
        `)
        .in("column_id", columnIds)
        .order("order_index");
      if (error) throw error;
      return data as unknown as TaskRecord[];
    },
    enabled: !!boardId && !!user,
  });

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: existing } = await supabase
        .from("tasks")
        .select("order_index")
        .eq("column_id", input.column_id)
        .order("order_index", { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

      const { error } = await supabase.from("tasks").insert({
        ...input,
        order_index: nextOrder,
      });
      if (error) throw error;

      // Log activity
      if (user) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "created",
          entity_type: "task",
          metadata: { title: input.title },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateTaskInput>) => {
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;

      if (user) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "updated",
          entity_type: "task",
          entity_id: id,
          metadata: updates,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;

      if (user) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "deleted",
          entity_type: "task",
          entity_id: id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const moveTask = useMutation({
    mutationFn: async ({ taskId, newColumnId, newOrderIndex }: MoveTaskInput) => {
      const { error } = await supabase
        .from("tasks")
        .update({ column_id: newColumnId, order_index: newOrderIndex })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const markDone = useMutation({
    mutationFn: async ({ taskId, targetColumnId, targetOrderIndex }: MarkDoneInput) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          is_done: true,
          column_id: targetColumnId,
          order_index: targetOrderIndex,
        })
        .eq("id", taskId);
      if (error) throw error;

      if (user) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "marked_done",
          entity_type: "task",
          entity_id: taskId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const markUndone = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_done: false })
        .eq("id", taskId);
      if (error) throw error;
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
