import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardService } from "@/services/boardService";
import { useAuth } from "./useAuth";

export function useBoards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const boardsQuery = useQuery({
    queryKey: ["boards", user?.id],
    queryFn: () => boardService.getMyBoards(),
    enabled: !!user,
  });

  const createBoard = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const board = await boardService.createBoard(name, user.id);
      await boardService.createDefaultColumns(board.id);
      return board;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const updateBoard = useMutation({
    mutationFn: async (
      updates: { id: string } & Partial<{ name: string; background_image_url: string | null }>
    ) => {
      const { id, ...fields } = updates;
      await boardService.updateBoard(id, fields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      await boardService.deleteBoard(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const uploadBoardBackground = useMutation({
    mutationFn: async ({ boardId, file }: { boardId: string; file: File }) => {
      await boardService.uploadBoardBackground(boardId, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const removeBoardBackground = useMutation({
    mutationFn: async ({ boardId, currentUrl }: { boardId: string; currentUrl: string }) => {
      await boardService.removeBoardBackground(boardId, currentUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  return {
    boards: boardsQuery.data ?? [],
    isLoading: boardsQuery.isLoading,
    createBoard,
    updateBoard,
    deleteBoard,
    uploadBoardBackground,
    removeBoardBackground,
  };
}
