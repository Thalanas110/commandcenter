import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from "@tanstack/react-query";

export const realtimeService = {
  subscribeBoardChanges(boardId: string, queryClient: QueryClient) {
    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "columns" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  subscribeActivityLogs(queryClient: QueryClient) {
    const channel = supabase
      .channel("activity-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
