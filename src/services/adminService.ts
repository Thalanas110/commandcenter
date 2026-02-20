import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_display_name?: string | null;
}

export interface DetailedStats {
  users: number;
  boards: number;
  tasks: number;
  labels: number;
  newUsersThisWeek: number;
  newTasksThisWeek: number;
  tasksDone: number;
  tasksPending: number;
  completionRate: number;
  tasksByPriority: { low: number; medium: number; high: number };
}

export interface DailyActivity {
  date: string;
  created: number;
  completed: number;
}

export type ActivityFilter = {
  action?: string;
  entity_type?: string;
  limit?: number;
};

export const adminService = {
  /** Basic counts — kept for backward compat. */
  async getStats() {
    const [users, boards, tasks, labels] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("boards").select("id", { count: "exact", head: true }),
      supabase.from("tasks").select("id", { count: "exact", head: true }),
      supabase.from("labels").select("id", { count: "exact", head: true }),
    ]);
    return {
      users: users.count ?? 0,
      boards: boards.count ?? 0,
      tasks: tasks.count ?? 0,
      labels: labels.count ?? 0,
    };
  },

  /** Full analytics stats: per-priority breakdown, weekly deltas, completion rate. */
  async getDetailedStats(): Promise<DetailedStats> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    const [
      users,
      boards,
      tasks,
      labels,
      newUsersThisWeek,
      newTasksThisWeek,
      tasksDoneCount,
      allTasksPriority,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("boards").select("id", { count: "exact", head: true }),
      supabase.from("tasks").select("id", { count: "exact", head: true }),
      supabase.from("labels").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgoISO),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgoISO),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("is_done", true),
      supabase.from("tasks").select("priority"),
    ]);

    const priorityCounts = { low: 0, medium: 0, high: 0 };
    (allTasksPriority.data ?? []).forEach((t) => {
      if (t.priority in priorityCounts) {
        priorityCounts[t.priority as keyof typeof priorityCounts]++;
      }
    });

    const totalTasks = tasks.count ?? 0;
    const done = tasksDoneCount.count ?? 0;
    const completionRate = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0;

    return {
      users: users.count ?? 0,
      boards: boards.count ?? 0,
      tasks: totalTasks,
      labels: labels.count ?? 0,
      newUsersThisWeek: newUsersThisWeek.count ?? 0,
      newTasksThisWeek: newTasksThisWeek.count ?? 0,
      tasksDone: done,
      tasksPending: totalTasks - done,
      completionRate,
      tasksByPriority: priorityCounts,
    };
  },

  /**
   * Tasks created vs completed per day for the last `days` days.
   * Two queries + client-side grouping — no per-day round-trips.
   */
  async getWeeklyActivity(days = 7): Promise<DailyActivity[]> {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    const sinceISO = since.toISOString();

    const [createdRes, completedRes] = await Promise.all([
      supabase.from("tasks").select("created_at").gte("created_at", sinceISO),
      supabase
        .from("tasks")
        .select("done_at")
        .not("done_at", "is", null)
        .gte("done_at", sinceISO),
    ]);

    const buckets: Record<string, { created: number; completed: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().split("T")[0]] = { created: 0, completed: 0 };
    }

    (createdRes.data ?? []).forEach((t) => {
      const key = (t.created_at as string).split("T")[0];
      if (key in buckets) buckets[key].created++;
    });
    (completedRes.data ?? []).forEach((t) => {
      if (t.done_at) {
        const key = (t.done_at as string).split("T")[0];
        if (key in buckets) buckets[key].completed++;
      }
    });

    return Object.entries(buckets).map(([date, counts]) => ({
      date: new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      ...counts,
    }));
  },

  /**
   * Fetch activity logs with optional filters + user display-name enrichment.
   */
  async getActivityLogs(
    limit = 100,
    filter: ActivityFilter = {}
  ): Promise<ActivityLog[]> {
    let query = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(filter.limit ?? limit);

    if (filter.action) query = query.eq("action", filter.action);
    if (filter.entity_type) query = query.eq("entity_type", filter.entity_type);

    const { data, error } = await query;
    if (error) throw error;
    const logs = (data ?? []) as ActivityLog[];

    // Batch-fetch display names for all distinct user IDs
    const userIds = [...new Set(logs.map((l) => l.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const nameMap: Record<string, string | null> = {};
      (profiles ?? []).forEach((p) => {
        nameMap[p.id] = p.display_name ?? null;
      });
      logs.forEach((log) => {
        log.user_display_name = nameMap[log.user_id] ?? null;
      });
    }

    return logs;
  },

  /**
   * Record a significant lifecycle event visible in the admin panel.
   * ONLY call this for meaningful events: created, deleted, marked_done.
   * Do NOT call it for every field update or drag-and-drop move.
   */
  async logActivity(
    userId: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ) {
    await supabase.from("activity_logs").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      ...(entityId ? { entity_id: entityId } : {}),
      ...(metadata ? { metadata: metadata as unknown as Json } : {}),
    });
  },
};
