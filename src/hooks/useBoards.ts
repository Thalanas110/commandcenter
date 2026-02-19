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
        .eq("owner_id", user!.id)
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
      const defaultColumns = ["To Do", "In Progress", "Done", "Blocked", "On Hold"];
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
    mutationFn: async (
      updates: { id: string } & Partial<{ name: string; background_image_url: string | null }>
    ) => {
      const { id, ...fields } = updates;
      const { error } = await supabase.from("boards").update(fields).eq("id", id);
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

  const uploadBoardBackground = useMutation({
    mutationFn: async ({ boardId, file }: { boardId: string; file: File }) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${boardId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("board-backgrounds")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("board-backgrounds")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("boards")
        .update({ background_image_url: urlData.publicUrl })
        .eq("id", boardId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const removeBoardBackground = useMutation({
    mutationFn: async ({ boardId, currentUrl }: { boardId: string; currentUrl: string }) => {
      const parts = currentUrl.split("/board-backgrounds/");
      if (parts.length > 1) {
        const storagePath = decodeURIComponent(parts[1]);
        await supabase.storage.from("board-backgrounds").remove([storagePath]);
      }

      const { error } = await supabase
        .from("boards")
        .update({ background_image_url: null })
        .eq("id", boardId);
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
    uploadBoardBackground,
    removeBoardBackground,
  };
}
