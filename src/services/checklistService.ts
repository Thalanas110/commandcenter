import { supabase } from "@/integrations/supabase/client";

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
}

export const checklistService = {
  async getItemsByTask(taskId: string): Promise<ChecklistItem[]> {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("task_id", taskId)
      .order("order_index");
    if (error) throw error;
    return data as ChecklistItem[];
  },

  async createItem(taskId: string, title: string, orderIndex: number) {
    const { error } = await supabase.from("checklist_items").insert({
      task_id: taskId,
      title,
      order_index: orderIndex,
    });
    if (error) throw error;
  },

  async updateItem(id: string, updates: Partial<{ title: string; is_completed: boolean }>) {
    const { error } = await supabase
      .from("checklist_items")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
  },

  async deleteItem(id: string) {
    const { error } = await supabase
      .from("checklist_items")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
