import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { kpiService, type KPITaskRecord, type ColumnRecord } from "@/services/kpiService";
import { useAuth } from "./useAuth";
import { differenceInDays, parseISO, isAfter, isBefore, startOfWeek, format } from "date-fns";

export interface KPISummary {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

export interface TasksByColumn {
  name: string;
  count: number;
  fill: string;
}

export interface TasksByPriority {
  priority: string;
  count: number;
  fill: string;
}

export interface TasksByMember {
  name: string;
  count: number;
  doneCount: number;
}

export interface CompletionTrend {
  week: string;
  done: number;
  created: number;
}

export interface GanttTask {
  id: string;
  title: string;
  start: Date;
  end: Date;
  priority: "low" | "medium" | "high";
  isDone: boolean;
  assignee: string | null;
  columnName: string;
}

const COLUMN_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

export function useKPIs(boardId: string | undefined) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["kpi", boardId],
    queryFn: () => kpiService.getBoardKPIData(boardId!),
    enabled: !!boardId && !!user,
  });

  const tasks: KPITaskRecord[] = useMemo(() => data?.tasks ?? [], [data]);
  const columns: ColumnRecord[] = useMemo(() => data?.columns ?? [], [data]);

  const today = useMemo(() => new Date(), []);

  const summary: KPISummary = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.is_done).length;
    const overdue = tasks.filter(
      (t) => !t.is_done && t.due_date && isBefore(parseISO(t.due_date), today)
    ).length;
    const doneCols = columns.filter((c) =>
      c.name.toLowerCase().trim() === "done"
    ).map((c) => c.id);
    const inProgress = tasks.filter(
      (t) => !t.is_done && !doneCols.includes(t.column_id)
    ).length;
    return {
      total,
      done,
      inProgress,
      overdue,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks, columns, today]);

  const tasksByColumn: TasksByColumn[] = useMemo(() => {
    return columns.map((col, i) => ({
      name: col.name,
      count: tasks.filter((t) => t.column_id === col.id).length,
      fill: COLUMN_COLORS[i % COLUMN_COLORS.length],
    }));
  }, [tasks, columns]);

  const tasksByPriority: TasksByPriority[] = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    tasks.forEach((t) => {
      if (t.priority in counts) counts[t.priority]++;
    });
    return [
      { priority: "High", count: counts.high, fill: PRIORITY_COLORS.high },
      { priority: "Medium", count: counts.medium, fill: PRIORITY_COLORS.medium },
      { priority: "Low", count: counts.low, fill: PRIORITY_COLORS.low },
    ].filter((p) => p.count > 0);
  }, [tasks]);

  const tasksByMember: TasksByMember[] = useMemo(() => {
    const map = new Map<string, { count: number; doneCount: number }>();
    tasks.forEach((t) => {
      const key = t.assignee_profile?.display_name ?? "Unassigned";
      const existing = map.get(key) ?? { count: 0, doneCount: 0 };
      map.set(key, {
        count: existing.count + 1,
        doneCount: existing.doneCount + (t.is_done ? 1 : 0),
      });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  const completionTrend: CompletionTrend[] = useMemo(() => {
    // Build last 6 weeks window
    const now = new Date();
    const weeks: { week: string; weekStart: Date; done: number; created: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      weeks.push({ week: format(ws, "MMM d"), weekStart: ws, done: 0, created: 0 });
    }

    tasks.forEach((t) => {
      weeks.forEach((w, idx) => {
        const weekEnd = new Date(w.weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        if (t.due_date) {
          const dd = parseISO(t.due_date);
          if (!isBefore(dd, w.weekStart) && isBefore(dd, weekEnd)) {
            if (t.is_done) w.done++;
            else w.created++;
          }
        }
      });
    });

    return weeks.map((w) => ({ week: w.week, done: w.done, created: w.created }));
  }, [tasks]);

  const ganttTasks: GanttTask[] = useMemo(() => {
    const colMap = new Map(columns.map((c) => [c.id, c.name]));
    return tasks
      .filter((t) => t.due_date)
      .map((t) => {
        const end = parseISO(t.due_date!);
        const start = t.start_date
          ? parseISO(t.start_date)
          : new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000); // fallback: 3 days before due
        return {
          id: t.id,
          title: t.title,
          start,
          end,
          priority: t.priority,
          isDone: t.is_done,
          assignee: t.assignee_profile?.display_name ?? null,
          columnName: colMap.get(t.column_id) ?? "Unknown",
        };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [tasks, columns]);

  const overdueDetails: KPITaskRecord[] = useMemo(() => {
    return tasks
      .filter(
        (t) => !t.is_done && t.due_date && isBefore(parseISO(t.due_date), today)
      )
      .map((t) => ({
        ...t,
        daysOverdue: differenceInDays(today, parseISO(t.due_date!)),
      })) as KPITaskRecord[];
  }, [tasks, today]);

  return {
    isLoading,
    error,
    refetch,
    tasks,
    columns,
    summary,
    tasksByColumn,
    tasksByPriority,
    tasksByMember,
    completionTrend,
    ganttTasks,
    overdueDetails,
  };
}
