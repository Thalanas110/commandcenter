import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { realtimeService } from "@/services/realtimeService";

export function useRealtimeBoard(boardId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    return realtimeService.subscribeBoardChanges(boardId, queryClient);
  }, [boardId, queryClient]);
}

export function useRealtimeActivityLogs() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return realtimeService.subscribeActivityLogs(queryClient);
  }, [queryClient]);
}
