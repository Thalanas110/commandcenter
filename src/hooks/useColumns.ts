import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useColumns(boardId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["columns", boardId] });

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
    mutationFn: async ({ name, boardId: bId, categoryId }: { name: string; boardId: string; categoryId?: string | null }) => {
      const maxOrder = columnsQuery.data?.length ?? 0;
      const insertData: Record<string, unknown> = { name, board_id: bId, order_index: maxOrder };
      if (categoryId) insertData.category_id = categoryId;
      const { error } = await supabase
        .from("columns")
        .insert(insertData);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateColumn = useMutation({
    mutationFn: async (
      updates: { id: string } & Partial<{ name: string; cover_image_url: string | null; category_id: string | null }>
    ) => {
      const { id, ...fields } = updates;
      const { error } = await supabase.from("columns").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteColumn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("columns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorderColumns = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from("columns").update({ order_index: index }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: invalidate,
  });

  const uploadColumnCover = useMutation({
    mutationFn: async ({ columnId, file }: { columnId: string; file: File }) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${columnId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("column-covers")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("column-covers")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("columns")
        .update({ cover_image_url: urlData.publicUrl })
        .eq("id", columnId);
      if (updateError) throw updateError;
    },
    onSuccess: invalidate,
  });

  const removeColumnCover = useMutation({
    mutationFn: async ({ columnId, currentUrl }: { columnId: string; currentUrl: string }) => {
      // Extract the storage path from the public URL
      const parts = currentUrl.split("/column-covers/");
      if (parts.length > 1) {
        const storagePath = decodeURIComponent(parts[1]);
        await supabase.storage.from("column-covers").remove([storagePath]);
      }

      const { error } = await supabase
        .from("columns")
        .update({ cover_image_url: null })
        .eq("id", columnId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    columns: columnsQuery.data ?? [],
    isLoading: columnsQuery.isLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    uploadColumnCover,
    removeColumnCover,
  };
}
