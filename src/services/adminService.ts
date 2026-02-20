import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const adminService = {
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

  async getActivityLogs(limit = 100): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as ActivityLog[];
  },

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
      ...(metadata ? { metadata } : {}),
    });
  },
};
