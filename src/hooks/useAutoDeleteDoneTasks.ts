import { useRef } from "react";

interface Task {
    id: string;
    column_id: string;
    is_done?: boolean;
    done_at?: string | null;
}

interface Column {
    id: string;
    name: string;
    category_id?: string | null;
}

interface CategoryWithAutoDelete {
    id: string;
    auto_delete_after_weeks: number | null;
}

interface DeleteTaskMutation {
    mutate: (id: string) => void;
}

/**
 * Auto-deletes cards that have been in a "Done" column for longer than the
 * category's configured `auto_delete_after_weeks` threshold.
 *
 * - Only tasks with a `done_at` timestamp are eligible (tasks marked done
 *   before this feature was introduced are left untouched).
 * - Runs once per board-view mount to avoid repeated deletions.
 */
export function useAutoDeleteDoneTasks(
    tasks: Task[],
    columns: Column[],
    categories: CategoryWithAutoDelete[],
    deleteTask: DeleteTaskMutation,
    isLoading: boolean
) {
    const hasRun = useRef(false);

    if (isLoading || hasRun.current || tasks.length === 0 || columns.length === 0) {
        return;
    }

    // Only proceed if at least one category has auto-delete configured
    const activeCategoryIds = new Set(
        categories
            .filter((c) => c.auto_delete_after_weeks != null && c.auto_delete_after_weeks > 0)
            .map((c) => c.id)
    );

    if (activeCategoryIds.size === 0) return;

    hasRun.current = true;

    const now = Date.now();

    for (const task of tasks) {
        // Only consider tasks explicitly flagged as done with a timestamp
        if (!task.is_done || !task.done_at) continue;

        const col = columns.find((c) => c.id === task.column_id);
        if (!col) continue;

        // Must be in a "Done" column (safety check – auto-move should already handle this)
        if (col.name.trim().toLowerCase() !== "done") continue;

        const categoryId = col.category_id;
        if (!categoryId || !activeCategoryIds.has(categoryId)) continue;

        const category = categories.find((c) => c.id === categoryId);
        if (!category?.auto_delete_after_weeks) continue;

        const doneMs = new Date(task.done_at).getTime();
        const thresholdMs = category.auto_delete_after_weeks * 7 * 24 * 60 * 60 * 1000;

        if (now - doneMs >= thresholdMs) {
            deleteTask.mutate(task.id);
        }
    }
}
