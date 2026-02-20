import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryService } from "@/services/categoryService";
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
            return categoryService.getCategoriesByBoard(boardId);
        },
        enabled: !!boardId && !!user,
    });

    const createCategory = useMutation({
        mutationFn: async ({ name, color }: { name: string; color?: string }) => {
            if (!boardId) throw new Error("No board");
            const maxOrder = categoriesQuery.data?.length ?? 0;
            const startIndex = await categoryService.getColumnCount(boardId);
            const categoryId = await categoryService.createCategory(boardId, name, maxOrder, color);
            await categoryService.createDefaultColumnsForCategory(boardId, categoryId, startIndex);
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
            await categoryService.updateCategory(id, fields);
        },
        onSuccess: invalidate,
    });

    const deleteCategory = useMutation({
        mutationFn: async (id: string) => {
            await categoryService.deleteCategory(id);
        },
        onSuccess: () => {
            invalidate();
            // columns with this category_id become null, refetch them
            queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
        },
    });

    const reorderCategories = useMutation({
        mutationFn: async (orderedIds: string[]) => {
            await categoryService.reorderCategories(orderedIds);
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
