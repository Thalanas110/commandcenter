import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useBoards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const boardsQuery = useQuery({
    queryKey: ["boards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createBoard = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("boards")
        .insert({ name, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // Create default columns
      const defaultColumns = ["To Do", "In Progress", "Done"];
      const columnsToInsert = defaultColumns.map((colName, index) => ({
        name: colName,
        board_id: data.id,
        order_index: index,
      }));
      const { error: colError } = await supabase.from("columns").insert(columnsToInsert);
      if (colError) throw colError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const updateBoard = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("boards").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  return {
    boards: boardsQuery.data ?? [],
    isLoading: boardsQuery.isLoading,
    createBoard,
    updateBoard,
    deleteBoard,
  };
}
