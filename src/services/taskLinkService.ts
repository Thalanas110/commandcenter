import { supabase } from "@/integrations/supabase/client";

export type TaskLinkType = "relates_to" | "blocks" | "is_blocked_by" | "duplicates";

export interface LinkedTaskInfo {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  is_done: boolean;
  column: { id: string; name: string } | null;
}

export interface TaskLink {
  id: string;
  link_type: TaskLinkType;
  created_at: string;
  target_task: LinkedTaskInfo | null;
}

export interface BoardTaskOption {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  is_done: boolean;
  column_name: string;
}

const INVERSE_LINK_TYPE: Record<TaskLinkType, TaskLinkType> = {
  relates_to: "relates_to",
  blocks: "is_blocked_by",
  is_blocked_by: "blocks",
  duplicates: "duplicates",
};

export const taskLinkService = {
  /** Fetch all outgoing links from a task (source_task_id = taskId). */
  async getLinksForTask(taskId: string): Promise<TaskLink[]> {
    const { data, error } = await supabase
      .from("task_links")
      .select(
        `id, link_type, created_at,
         target_task:tasks!task_links_target_task_id_fkey (
           id, title, priority, is_done,
           column:columns!tasks_column_id_fkey (id, name)
         )`
      )
      .eq("source_task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as TaskLink[];
  },

  /** Search tasks in a board by title, excluding a specific task. */
  async searchBoardTasks(boardId: string, query: string, excludeTaskId: string): Promise<BoardTaskOption[]> {
    const { data: columns } = await supabase
      .from("columns")
      .select("id, name")
      .eq("board_id", boardId);

    if (!columns?.length) return [];
    const columnIds = columns.map((c) => c.id);
    const colMap = Object.fromEntries(columns.map((c) => [c.id, c.name]));

    let req = supabase
      .from("tasks")
      .select("id, title, priority, is_done, column_id")
      .in("column_id", columnIds)
      .neq("id", excludeTaskId)
      .order("title");

    if (query.trim()) {
      req = req.ilike("title", `%${query.trim()}%`);
    }

    const { data, error } = await req.limit(30);
    if (error) throw error;

    return (data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority as "low" | "medium" | "high",
      is_done: t.is_done ?? false,
      column_name: colMap[t.column_id] ?? "",
    }));
  },

  /** Add a bidirectional link pair between two tasks. */
  async addLink(
    sourceTaskId: string,
    targetTaskId: string,
    linkType: TaskLinkType,
    createdBy: string
  ): Promise<void> {
    const inverseType = INVERSE_LINK_TYPE[linkType];

    // Insert forward link; ignore conflict if it already exists
    const { error: e1 } = await supabase.from("task_links").upsert(
      {
        source_task_id: sourceTaskId,
        target_task_id: targetTaskId,
        link_type: linkType,
        created_by: createdBy,
      },
      { onConflict: "source_task_id,target_task_id", ignoreDuplicates: true }
    );
    if (e1) throw e1;

    // Insert inverse link
    const { error: e2 } = await supabase.from("task_links").upsert(
      {
        source_task_id: targetTaskId,
        target_task_id: sourceTaskId,
        link_type: inverseType,
        created_by: createdBy,
      },
      { onConflict: "source_task_id,target_task_id", ignoreDuplicates: true }
    );
    if (e2) throw e2;
  },

  /** Remove a link by its id and also remove the inverse link. */
  async removeLink(linkId: string): Promise<void> {
    // Fetch the link first to know the pair
    const { data: link, error: fe } = await supabase
      .from("task_links")
      .select("id, source_task_id, target_task_id")
      .eq("id", linkId)
      .single();
    if (fe) throw fe;

    // Delete the forward link
    const { error: de1 } = await supabase.from("task_links").delete().eq("id", linkId);
    if (de1) throw de1;

    // Delete the inverse link (if it exists)
    await supabase
      .from("task_links")
      .delete()
      .eq("source_task_id", link.target_task_id)
      .eq("target_task_id", link.source_task_id);
  },
};
