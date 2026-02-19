import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BoardLabel {
  id: string;
  name: string;
  color: string;
  board_id: string;
}

export function useLabels(boardId: string | undefined) {
  const queryClient = useQueryClient();

  const labelsQuery = useQuery({
    queryKey: ["labels", boardId],
    queryFn: async (): Promise<BoardLabel[]> => {
      if (!boardId) return [];
      // board_id is added by migration 20260219230000_add_board_labels.sql.
      // Supabase generated types won't reflect it until regenerated, so we cast.
      const res = await supabase
        .from("labels")
        .select("*")
        .order("name");
      if (res.error) throw res.error;
      const rows = (res.data ?? []) as unknown as BoardLabel[];
      // Filter client-side by board_id to scope to this board
      return rows.filter((l) => l.board_id === boardId);
    },
    enabled: !!boardId,
  });

  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!boardId) throw new Error("No boardId");
      // Insert with board_id — cast needed until types regenerated
      const res = await (supabase.from("labels") as unknown as {
        insert: (v: object) => Promise<{ error: unknown }>;
      }).insert({ name, color, board_id: boardId });
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
    },
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase.from("labels").update({ name, color }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
    },
  });

  const toggleTaskLabel = useMutation({
    mutationFn: async ({ taskId, labelId, attach }: { taskId: string; labelId: string; attach: boolean }) => {
      if (attach) {
        // upsert with ignoreDuplicates prevents 409 if the row already exists
        const { error } = await supabase
          .from("task_labels")
          .upsert({ task_id: taskId, label_id: labelId }, { ignoreDuplicates: true });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("task_labels").delete().eq("task_id", taskId).eq("label_id", labelId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    labels: labelsQuery.data ?? [],
    isLoading: labelsQuery.isLoading,
    createLabel,
    updateLabel,
    deleteLabel,
    toggleTaskLabel,
  };
}
