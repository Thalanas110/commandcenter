import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService, type ActivityFilter } from "@/services/adminService";
import { useRealtimeActivityLogs } from "@/hooks/useRealtime";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Pencil,
  UserCog,
  ShieldCheck,
  ShieldOff,
  LayoutDashboard,
  ListTodo,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ActionMeta = {
  icon: React.ElementType;
  label: string;
  badgeVariant: "default" | "destructive" | "secondary" | "outline";
  color: string;
};

const ACTION_META: Record<string, ActionMeta> = {
  created: {
    icon: PlusCircle,
    label: "Created",
    badgeVariant: "default",
    color: "text-green-500",
  },
  deleted: {
    icon: Trash2,
    label: "Deleted",
    badgeVariant: "destructive",
    color: "text-red-500",
  },
  marked_done: {
    icon: CheckCircle2,
    label: "Marked done",
    badgeVariant: "secondary",
    color: "text-blue-500",
  },
  updated: {
    icon: Pencil,
    label: "Updated",
    badgeVariant: "outline",
    color: "text-yellow-500",
  },
  grant_admin: {
    icon: ShieldCheck,
    label: "Granted admin",
    badgeVariant: "default",
    color: "text-purple-500",
  },
  revoke_admin: {
    icon: ShieldOff,
    label: "Revoked admin",
    badgeVariant: "destructive",
    color: "text-orange-500",
  },
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  task: ListTodo,
  board: LayoutDashboard,
  user: UserCog,
};

function getActionMeta(action: string): ActionMeta {
  return (
    ACTION_META[action] ?? {
      icon: Activity,
      label: action,
      badgeVariant: "outline",
      color: "text-muted-foreground",
    }
  );
}

export default function AdminActivityPage() {
  useRealtimeActivityLogs();

  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const filter: ActivityFilter = {
    limit: 100,
    ...(actionFilter !== "all" ? { action: actionFilter } : {}),
    ...(entityFilter !== "all" ? { entity_type: entityFilter } : {}),
  };

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-logs", actionFilter, entityFilter],
    queryFn: () => adminService.getActivityLogs(100, filter),
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Logs</h2>
          <p className="text-sm text-muted-foreground">
            Meaningful lifecycle events only — not every field change
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
              <SelectItem value="marked_done">Marked done</SelectItem>
              <SelectItem value="grant_admin">Grant admin</SelectItem>
              <SelectItem value="revoke_admin">Revoke admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="board">Board</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : logs?.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Activity className="mb-3 h-10 w-10" />
          <p>No activity matching these filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs?.map((log) => {
            const meta = getActionMeta(log.action);
            const ActionIcon = meta.icon;
            const EntityIcon = ENTITY_ICONS[log.entity_type] ?? Activity;
            const displayName =
              log.user_display_name ?? `User …${log.user_id.slice(-6)}`;
            const titleMeta = (log.metadata as Record<string, unknown>)?.title;

            return (
              <Card key={log.id}>
                <CardContent className="flex items-start gap-3 py-3">
                  {/* Action icon */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted`}
                  >
                    <ActionIcon className={`h-4 w-4 ${meta.color}`} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold">{displayName}</span>
                      &nbsp;
                      <Badge variant={meta.badgeVariant} className="text-xs py-0 px-1.5 mr-1">
                        {meta.label}
                      </Badge>
                      <span className="text-muted-foreground capitalize">{log.entity_type}</span>
                      {titleMeta && (
                        <span className="text-muted-foreground">
                          {" "}— &quot;{String(titleMeta)}&quot;
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* Entity type chip */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <EntityIcon className="h-3 w-3" />
                    <span className="capitalize">{log.entity_type}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

