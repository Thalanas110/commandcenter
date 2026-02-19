import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Category {
    id: string;
    name: string;
    color: string;
    board_id: string;
    order_index: number;
    created_at: string;
    updated_at: string;
}

export function useCategories(boardId: string | undefined) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ["categories", boardId] });

    const categoriesQuery = useQuery({
        queryKey: ["categories", boardId],
        queryFn: async () => {
            if (!boardId) return [];
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .eq("board_id", boardId)
                .order("order_index");
            if (error) throw error;
            return data as Category[];
        },
        enabled: !!boardId && !!user,
    });

    const DEFAULT_COLUMNS = ["To Do", "In Progress", "Review", "Done", "On Hold", "Blocked"] as const;

    const createCategory = useMutation({
        mutationFn: async ({ name, color }: { name: string; color?: string }) => {
            if (!boardId) throw new Error("No board");
            const maxOrder = categoriesQuery.data?.length ?? 0;
            const insertData: Record<string, unknown> = {
                name,
                board_id: boardId,
                order_index: maxOrder,
            };
            if (color) insertData.color = color;

            // Create the category and get its ID back
            const { data: newCategory, error } = await supabase
                .from("categories")
                .insert(insertData)
                .select("id")
                .single();
            if (error) throw error;

            // Fetch existing column count so order_index continues correctly
            const { count } = await supabase
                .from("columns")
                .select("*", { count: "exact", head: true })
                .eq("board_id", boardId);

            const startIndex = count ?? 0;

            // Auto-create the 5 default columns linked to this category
            const columnRows = DEFAULT_COLUMNS.map((colName, i) => ({
                name: colName,
                board_id: boardId,
                order_index: startIndex + i,
                category_id: newCategory.id,
            }));

            const { error: colError } = await supabase
                .from("columns")
                .insert(columnRows);
            if (colError) throw colError;
        },
        onSuccess: () => {
            invalidate();
            queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
        },
    });

    const updateCategory = useMutation({
        mutationFn: async (
            updates: { id: string } & Partial<{ name: string; color: string }>
        ) => {
            const { id, ...fields } = updates;
            const { error } = await supabase
                .from("categories")
                .update(fields)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    const deleteCategory = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("categories")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidate();
            // columns with this category_id become null, refetch them
            queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
        },
    });

    const reorderCategories = useMutation({
        mutationFn: async (orderedIds: string[]) => {
            const updates = orderedIds.map((id, index) =>
                supabase.from("categories").update({ order_index: index }).eq("id", id)
            );
            await Promise.all(updates);
        },
        onSuccess: invalidate,
    });

    return {
        categories: categoriesQuery.data ?? [],
        isLoading: categoriesQuery.isLoading,
        createCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
    };
}
