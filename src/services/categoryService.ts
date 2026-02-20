import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/hooks/useCategories";

const DEFAULT_COLUMNS = ["To Do", "In Progress", "Review", "Done", "On Hold", "Blocked"] as const;

export const categoryService = {
  async getColumnCount(boardId: string): Promise<number> {
    const { count } = await supabase
      .from("columns")
      .select("*", { count: "exact", head: true })
      .eq("board_id", boardId);
    return count ?? 0;
  },

  async getCategoriesByBoard(boardId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("board_id", boardId)
      .order("order_index");
    if (error) throw error;
    return data as Category[];
  },

  async createCategory(
    boardId: string,
    name: string,
    orderIndex: number,
    color?: string
  ): Promise<string> {
    const insertData = {
      name,
      board_id: boardId,
      order_index: orderIndex,
      ...(color ? { color } : {}),
    };

    const { data: newCategory, error } = await supabase
      .from("categories")
      .insert(insertData as never)
      .select("id")
      .single();
    if (error) throw error;
    return newCategory.id;
  },

  async createDefaultColumnsForCategory(
    boardId: string,
    categoryId: string,
    startIndex: number
  ) {
    const columnRows = DEFAULT_COLUMNS.map((colName, i) => ({
      name: colName,
      board_id: boardId,
      order_index: startIndex + i,
      category_id: categoryId,
    }));
    const { error } = await supabase.from("columns").insert(columnRows);
    if (error) throw error;
  },

  async updateCategory(
    id: string,
    fields: Partial<{ name: string; color: string; auto_delete_after_weeks: number | null }>
  ) {
    const { error } = await supabase
      .from("categories")
      .update(fields)
      .eq("id", id);
    if (error) throw error;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async reorderCategories(orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      supabase.from("categories").update({ order_index: index }).eq("id", id)
    );
    await Promise.all(updates);
  },
};
