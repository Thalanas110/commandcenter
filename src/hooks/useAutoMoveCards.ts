import { useRef } from "react";

interface Column {
    id: string;
    name: string;
    category_id?: string | null;
}

interface Task {
    id: string;
    column_id: string;
    due_date: string | null;
    is_done?: boolean;
}

interface MoveTaskMutation {
    mutate: (input: { taskId: string; newColumnId: string; newOrderIndex: number }) => void;
}

/**
 * Finds the target column by name within the same category.
 * Returns undefined if the task's column has no category or no matching column exists.
 */
function findSiblingColumn(
    task: Task,
    columns: Column[],
    targetName: string
): Column | undefined {
    const currentCol = columns.find((c) => c.id === task.column_id);
    if (!currentCol) return undefined; // Should be impossible if data integrity is good

    return columns.find((c) => {
        // Match category (both null OR both same ID)
        const sameCategory = (currentCol.category_id || null) === (c.category_id || null);

        // Match name (case-insensitive)
        const sameName = c.name.trim().toLowerCase() === targetName.trim().toLowerCase();

        return sameCategory && sameName;
    });
}

/**
 * Auto-moves overdue cards to "On Hold" and done cards to "Done"
 * within the same category. Runs once when data becomes available.
 */
export function useAutoMoveCards(
    tasks: Task[],
    columns: Column[],
    allTasks: Task[],
    moveTask: MoveTaskMutation,
    isLoading: boolean
) {
    const hasRun = useRef(false);

    // Only run once per board view load
    if (isLoading || hasRun.current || tasks.length === 0 || columns.length === 0) {
        return;
    }

    hasRun.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const task of tasks) {
        // --- Overdue → On Hold ---
        if (task.due_date && !task.is_done) {
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate < today) {
                const currentCol = columns.find((c) => c.id === task.column_id);
                const currentName = currentCol?.name.toLowerCase().trim();

                // Skip if already in "On Hold"
                if (currentName === "on hold") continue;

                const onHoldCol = findSiblingColumn(task, columns, "on hold");
                if (onHoldCol) {
                    const tasksInTarget = allTasks.filter(
                        (t) => t.column_id === onHoldCol.id
                    );
                    moveTask.mutate({
                        taskId: task.id,
                        newColumnId: onHoldCol.id,
                        newOrderIndex: tasksInTarget.length,
                    });
                }
            }
        }

        // --- Done → Done column ---
        if (task.is_done) {
            const currentCol = columns.find((c) => c.id === task.column_id);
            const currentName = currentCol?.name.toLowerCase().trim();

            // Skip if already in "Done"
            if (currentName === "done") continue;

            const doneCol = findSiblingColumn(task, columns, "done");
            if (doneCol) {
                const tasksInTarget = allTasks.filter(
                    (t) => t.column_id === doneCol.id
                );
                moveTask.mutate({
                    taskId: task.id,
                    newColumnId: doneCol.id,
                    newOrderIndex: tasksInTarget.length,
                });
            }
        }
    }
}
