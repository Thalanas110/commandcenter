import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useChecklists(taskId: string | undefined) {
    const queryClient = useQueryClient();

    const checklistQuery = useQuery({
        queryKey: ["checklists", taskId],
        queryFn: async () => {
            if (!taskId) return [];
            const { data, error } = await supabase
                .from("checklist_items")
                .select("*")
                .eq("task_id", taskId)
                .order("order_index");
            if (error) throw error;
            return data;
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
            const { error } = await supabase.from("checklist_items").insert({
                task_id: taskId,
                title,
                order_index: nextOrder,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["checklists", taskId] });
        },
    });

    const updateItem = useMutation({
        mutationFn: async ({ id, ...updates }: { id: string; title?: string; is_completed?: boolean }) => {
            const { error } = await supabase
                .from("checklist_items")
                .update(updates)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["checklists", taskId] });
        },
    });

    const deleteItem = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("checklist_items")
                .delete()
                .eq("id", id);
            if (error) throw error;
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
