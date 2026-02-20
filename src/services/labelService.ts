import { supabase } from "@/integrations/supabase/client";
import type { BoardLabel } from "@/hooks/useLabels";

export const labelService = {
  async getLabelsByBoard(boardId: string): Promise<BoardLabel[]> {
    const res = await supabase
      .from("labels")
      .select("*")
      .order("name");
    if (res.error) throw res.error;
    const rows = (res.data ?? []) as unknown as BoardLabel[];
    return rows.filter((l) => l.board_id === boardId);
  },

  async createLabel(boardId: string, name: string, color: string) {
    const res = await (supabase.from("labels") as unknown as {
      insert: (v: object) => Promise<{ error: unknown }>;
    }).insert({ name, color, board_id: boardId });
    if (res.error) throw res.error;
  },

  async updateLabel(id: string, name: string, color: string) {
    const { error } = await supabase
      .from("labels")
      .update({ name, color })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteLabel(id: string) {
    const { error } = await supabase.from("labels").delete().eq("id", id);
    if (error) throw error;
  },

  async attachLabelToTask(taskId: string, labelId: string) {
    const { error } = await supabase
      .from("task_labels")
      .upsert({ task_id: taskId, label_id: labelId }, { ignoreDuplicates: true });
    if (error) throw error;
  },

  async detachLabelFromTask(taskId: string, labelId: string) {
    const { error } = await supabase
      .from("task_labels")
      .delete()
      .eq("task_id", taskId)
      .eq("label_id", labelId);
    if (error) throw error;
  },
};
