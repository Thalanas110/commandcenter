import { supabase } from "@/integrations/supabase/client";

export const columnService = {
  async getColumnsByBoard(boardId: string) {
    const { data, error } = await supabase
      .from("columns")
      .select("*")
      .eq("board_id", boardId)
      .order("order_index");
    if (error) throw error;
    return data;
  },

  async getColumnIds(boardId: string) {
    const { data } = await supabase
      .from("columns")
      .select("id")
      .eq("board_id", boardId);
    return data ?? [];
  },

  async getColumnCount(boardId: string) {
    const { count } = await supabase
      .from("columns")
      .select("*", { count: "exact", head: true })
      .eq("board_id", boardId);
    return count ?? 0;
  },

  async createColumn(
    name: string,
    boardId: string,
    orderIndex: number,
    categoryId?: string | null
  ) {
    const insertData: Record<string, unknown> = {
      name,
      board_id: boardId,
      order_index: orderIndex,
    };
    if (categoryId) insertData.category_id = categoryId;

    const { error } = await supabase.from("columns").insert(insertData);
    if (error) throw error;
  },

  async updateColumn(
    id: string,
    fields: Partial<{
      name: string;
      cover_image_url: string | null;
      category_id: string | null;
    }>
  ) {
    const { error } = await supabase.from("columns").update(fields).eq("id", id);
    if (error) throw error;
  },

  async deleteColumn(id: string) {
    const { error } = await supabase.from("columns").delete().eq("id", id);
    if (error) throw error;
  },

  async reorderColumns(orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      supabase.from("columns").update({ order_index: index }).eq("id", id)
    );
    await Promise.all(updates);
  },

  async uploadColumnCover(columnId: string, file: File) {
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

  async removeColumnCover(columnId: string, currentUrl: string) {
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
};
