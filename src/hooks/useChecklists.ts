import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checklistService } from "@/services/checklistService";

export function useChecklists(taskId: string | undefined) {
    const queryClient = useQueryClient();

    const checklistQuery = useQuery({
        queryKey: ["checklists", taskId],
        queryFn: async () => {
            if (!taskId) return [];
            return checklistService.getItemsByTask(taskId);
        },
        enabled: !!taskId,
    });

    const createItem = useMutation({
        mutationFn: async (title: string) => {
            if (!taskId) return;
            const existing = checklistQuery.data ?? [];
            const nextOrder = existing.length > 0
                ? Math.max(...existing.map((i) => i.order_index)) + 1
                : 0;
            await checklistService.createItem(taskId, title, nextOrder);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["checklists", taskId] });
        },
    });

    const updateItem = useMutation({
        mutationFn: async ({ id, ...updates }: { id: string; title?: string; is_completed?: boolean }) => {
            await checklistService.updateItem(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["checklists", taskId] });
        },
    });

    const deleteItem = useMutation({
        mutationFn: async (id: string) => {
            await checklistService.deleteItem(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["checklists", taskId] });
        },
    });

    return {
        items: checklistQuery.data ?? [],
        isLoading: checklistQuery.isLoading,
        createItem,
        updateItem,
        deleteItem,
    };
}
