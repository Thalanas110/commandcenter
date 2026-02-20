import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labelService } from "@/services/labelService";

export interface BoardLabel {
  id: string;
  name: string;
  color: string;
  board_id: string;
}

export function useLabels(boardId: string | undefined) {
  const queryClient = useQueryClient();

  const labelsQuery = useQuery({
    queryKey: ["labels", boardId],
    queryFn: async (): Promise<BoardLabel[]> => {
      if (!boardId) return [];
      return labelService.getLabelsByBoard(boardId);
    },
    enabled: !!boardId,
  });

  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!boardId) throw new Error("No boardId");
      await labelService.createLabel(boardId, name, color);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
    },
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      await labelService.updateLabel(id, name, color);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      await labelService.deleteLabel(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
    },
  });

  const toggleTaskLabel = useMutation({
    mutationFn: async ({ taskId, labelId, attach }: { taskId: string; labelId: string; attach: boolean }) => {
      if (attach) {
        await labelService.attachLabelToTask(taskId, labelId);
      } else {
        await labelService.detachLabelFromTask(taskId, labelId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    labels: labelsQuery.data ?? [],
    isLoading: labelsQuery.isLoading,
    createLabel,
    updateLabel,
    deleteLabel,
    toggleTaskLabel,
  };
}
