import { supabase } from "@/integrations/supabase/client";
import type { TaskRecord } from "@/hooks/useTasks";

export const taskService = {
  async getTasksByBoard(boardId: string): Promise<TaskRecord[]> {
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

  async getNextOrderIndex(columnId: string): Promise<number> {
    const { data: existing } = await supabase
      .from("tasks")
      .select("order_index")
      .eq("column_id", columnId)
      .order("order_index", { ascending: false })
      .limit(1);
    return (existing?.[0]?.order_index ?? -1) + 1;
  },

  async createTask(input: {
    title: string;
    description?: string;
    due_date?: string;
    priority: "low" | "medium" | "high";
    column_id: string;
    order_index: number;
  }) {
    const { error } = await supabase.from("tasks").insert(input);
    if (error) throw error;
  },

  async updateTask(id: string, updates: Record<string, unknown>) {
    const { error } = await supabase.from("tasks").update(updates).eq("id", id);
    if (error) throw error;
  },

  async deleteTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  },

  async moveTask(taskId: string, newColumnId: string, newOrderIndex: number) {
    const { error } = await supabase
      .from("tasks")
      .update({ column_id: newColumnId, order_index: newOrderIndex })
      .eq("id", taskId);
    if (error) throw error;
  },

  async markTaskDone(taskId: string, targetColumnId: string, targetOrderIndex: number) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_done: true, column_id: targetColumnId, order_index: targetOrderIndex })
      .eq("id", taskId);
    if (error) throw error;
  },

  async markTaskUndone(taskId: string) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_done: false })
      .eq("id", taskId);
    if (error) throw error;
  },

  async uploadTaskCover(taskId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${taskId}/cover.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("task-covers")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("task-covers").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  },
};
