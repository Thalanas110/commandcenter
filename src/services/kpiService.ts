import { supabase } from "@/integrations/supabase/client";

export interface KPITaskRecord {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  start_date: string | null;
  column_id: string;
  order_index: number;
  is_done: boolean;
  assigned_to: string | null;
  assignee_profile?: { display_name: string | null; avatar_url: string | null } | null;
}

export interface ColumnRecord {
  id: string;
  name: string;
  board_id: string;
  order_index: number;
}

export interface KPIData {
  tasks: KPITaskRecord[];
  columns: ColumnRecord[];
}

export const kpiService = {
  async getBoardKPIData(boardId: string): Promise<KPIData> {
    const { data: columns, error: colError } = await supabase
      .from("columns")
      .select("id, name, board_id, order_index")
      .eq("board_id", boardId)
      .order("order_index");

    if (colError) throw colError;
    if (!columns?.length) return { tasks: [], columns: [] };

    const columnIds = columns.map((c) => c.id);

    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id, title, description, priority, due_date, start_date,
        column_id, order_index, is_done, assigned_to,
        assignee_profile:profiles!tasks_assigned_to_fkey (
          display_name,
          avatar_url
        )
      `)
      .in("column_id", columnIds)
      .order("order_index");

    if (taskError) throw taskError;

    return {
      tasks: (tasks ?? []) as unknown as KPITaskRecord[],
      columns: (columns ?? []) as ColumnRecord[],
    };
  },
};
