import { supabase } from "@/integrations/supabase/client";

export const boardService = {
  async getMyBoards() {
    const { data, error } = await supabase.rpc("get_my_boards");
    if (error) throw error;
    return data;
  },

  async createBoard(name: string, ownerId: string) {
    const { data, error } = await supabase
      .from("boards")
      .insert({ name, owner_id: ownerId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createDefaultColumns(boardId: string) {
    const defaultColumns = ["To Do", "In Progress", "Done", "Blocked", "On Hold"];
    const columnsToInsert = defaultColumns.map((colName, index) => ({
      name: colName,
      board_id: boardId,
      order_index: index,
    }));
    const { error } = await supabase.from("columns").insert(columnsToInsert);
    if (error) throw error;
  },

  async updateBoard(
    id: string,
    fields: Partial<{ name: string; background_image_url: string | null }>
  ) {
    const { error } = await supabase.from("boards").update(fields).eq("id", id);
    if (error) throw error;
  },

  async deleteBoard(id: string) {
    const { error } = await supabase.from("boards").delete().eq("id", id);
    if (error) throw error;
  },

  async uploadBoardBackground(boardId: string, file: File) {
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

  async removeBoardBackground(boardId: string, currentUrl: string) {
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
};
