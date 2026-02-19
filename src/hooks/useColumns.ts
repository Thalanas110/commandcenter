import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useColumns(boardId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const columnsQuery = useQuery({
    queryKey: ["columns", boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from("columns")
        .select("*")
        .eq("board_id", boardId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!boardId && !!user,
  });

  const createColumn = useMutation({
    mutationFn: async ({ name, boardId: bId }: { name: string; boardId: string }) => {
      const maxOrder = columnsQuery.data?.length ?? 0;
      const { error } = await supabase
        .from("columns")
        .insert({ name, board_id: bId, order_index: maxOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
    },
  });

  const updateColumn = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("columns").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
    },
  });

  const deleteColumn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("columns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
    },
  });

  const reorderColumns = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase.from("columns").update({ order_index: index }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
    },
  });

  return {
    columns: columnsQuery.data ?? [],
    isLoading: columnsQuery.isLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
  };
}
