import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskLinkService, TaskLink, BoardTaskOption, TaskLinkType } from "@/services/taskLinkService";
import { authService } from "@/services/authService";

export type { TaskLink, BoardTaskOption, TaskLinkType };

export const LINK_TYPE_CONFIG: Record<TaskLinkType, { label: string; color: string }> = {
  relates_to: { label: "Relates to", color: "text-muted-foreground" },
  blocks: { label: "Blocks", color: "text-destructive" },
  is_blocked_by: { label: "Blocked by", color: "text-amber-600 dark:text-amber-500" },
  duplicates: { label: "Duplicates", color: "text-purple-600 dark:text-purple-400" },
};

export function useTaskLinks(taskId: string | undefined, boardId: string | undefined) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch links for this task
  const linksQuery = useQuery({
    queryKey: ["task_links", taskId],
    queryFn: async (): Promise<TaskLink[]> => {
      if (!taskId) return [];
      return taskLinkService.getLinksForTask(taskId);
    },
    enabled: !!taskId,
  });

  // Search tasks to link
  const searchQuery_ = useQuery({
    queryKey: ["task_link_search", boardId, searchQuery],
    queryFn: async (): Promise<BoardTaskOption[]> => {
      if (!boardId || !taskId) return [];
      return taskLinkService.searchBoardTasks(boardId, searchQuery, taskId);
    },
    enabled: !!boardId && !!taskId,
    staleTime: 1000 * 10,
  });

  const addLink = useMutation({
    mutationFn: async ({
      targetTaskId,
      linkType,
    }: {
      targetTaskId: string;
      linkType: TaskLinkType;
    }) => {
      if (!taskId) return;
      const {
        data: { user },
      } = await authService.getUser();
      if (!user) throw new Error("Not authenticated");
      await taskLinkService.addLink(taskId, targetTaskId, linkType, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_links", taskId] });
    },
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      await taskLinkService.removeLink(linkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_links", taskId] });
    },
  });

  const setSearch = useCallback((q: string) => setSearchQuery(q), []);

  return {
    links: linksQuery.data ?? [],
    isLoadingLinks: linksQuery.isLoading,
    searchResults: searchQuery_.data ?? [],
    isSearching: searchQuery_.isFetching,
    setSearch,
    searchQuery,
    addLink,
    removeLink,
  };
}
