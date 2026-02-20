import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { useRealtimeActivityLogs } from "@/hooks/useRealtime";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

export default function AdminActivityPage() {
  useRealtimeActivityLogs();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => adminService.getActivityLogs(100),
  });

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Activity Logs</h2>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : logs?.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Activity className="mb-3 h-10 w-10" />
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs?.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">User</span>{" "}
                    {log.action}{" "}
                    <span className="text-muted-foreground">a {log.entity_type}</span>
                    {(log.metadata as Record<string, unknown>)?.title && (
                      <span className="text-muted-foreground"> — "{(log.metadata as Record<string, unknown>).title as string}"</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
