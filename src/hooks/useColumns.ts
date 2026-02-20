import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { columnService } from "@/services/columnService";
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
      return columnService.getColumnsByBoard(boardId);
    },
    enabled: !!boardId && !!user,
  });

  const createColumn = useMutation({
    mutationFn: async ({ name, boardId: bId, categoryId }: { name: string; boardId: string; categoryId?: string | null }) => {
      const maxOrder = columnsQuery.data?.length ?? 0;
      await columnService.createColumn(name, bId, maxOrder, categoryId);
    },
    onSuccess: invalidate,
  });

  const updateColumn = useMutation({
    mutationFn: async (
      updates: { id: string } & Partial<{ name: string; cover_image_url: string | null; category_id: string | null }>
    ) => {
      const { id, ...fields } = updates;
      await columnService.updateColumn(id, fields);
    },
    onSuccess: invalidate,
  });

  const deleteColumn = useMutation({
    mutationFn: async (id: string) => {
      await columnService.deleteColumn(id);
    },
    onSuccess: invalidate,
  });

  const reorderColumns = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await columnService.reorderColumns(orderedIds);
    },
    onSuccess: invalidate,
  });

  const uploadColumnCover = useMutation({
    mutationFn: async ({ columnId, file }: { columnId: string; file: File }) => {
      await columnService.uploadColumnCover(columnId, file);
    },
    onSuccess: invalidate,
  });

  const removeColumnCover = useMutation({
    mutationFn: async ({ columnId, currentUrl }: { columnId: string; currentUrl: string }) => {
      await columnService.removeColumnCover(columnId, currentUrl);
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
