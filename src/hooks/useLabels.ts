import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLabels() {
  const queryClient = useQueryClient();

  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labels")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { error } = await supabase.from("labels").insert({ name, color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase.from("labels").update({ name, color }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const toggleTaskLabel = useMutation({
    mutationFn: async ({ taskId, labelId, attach }: { taskId: string; labelId: string; attach: boolean }) => {
      if (attach) {
        const { error } = await supabase.from("task_labels").insert({ task_id: taskId, label_id: labelId });
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
