import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import type { TaskRecord } from "@/hooks/useTasks";

interface CalendarViewProps {
  boardId: string;
  tasks: TaskRecord[];
  onUpdateTask: (id: string, updates: Record<string, unknown>) => void;
  onDeleteTask: (id: string) => void;
}

const PRIORITY_CLASSES: Record<string, string> = {
  high: "bg-red-500/90 text-white border-red-600",
  medium: "bg-amber-500/90 text-white border-amber-600",
  low: "bg-emerald-500/90 text-white border-emerald-600",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const MAX_VISIBLE_PER_DAY = 3;

export function CalendarView({ boardId, tasks, onUpdateTask, onDeleteTask }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [overflowDay, setOverflowDay] = useState<Date | null>(null);

  // Build the calendar grid (full weeks covering the month)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Index tasks by date string (due_date), also include start_date tasks
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskRecord[]>();
    const addToDate = (dateStr: string | null | undefined, task: TaskRecord) => {
      if (!dateStr) return;
      try {
        const key = format(parseISO(dateStr), "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      } catch {
        // ignore invalid dates
      }
    };

    for (const task of tasks) {
      addToDate(task.due_date, task);
    }

    return map;
  }, [tasks]);

  const getTasksForDay = (day: Date): TaskRecord[] => {
    const key = format(day, "yyyy-MM-dd");
    return tasksByDate.get(key) ?? [];
  };

  const totalTasksWithDates = useMemo(
    () => tasks.filter((t) => t.due_date).length,
    [tasks]
  );

  const overflowTasks = overflowDay ? getTasksForDay(overflowDay) : [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold sm:text-lg">Calendar</h2>
          <p className="text-xs text-muted-foreground">
            Tasks plotted by due date.{" "}
            {totalTasksWithDates === 0
              ? "Add due dates to tasks to see them here."
              : `${totalTasksWithDates} task${totalTasksWithDates !== 1 ? "s" : ""} with due dates.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[120px] text-center text-sm font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={() => setCurrentMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1 flex-shrink-0">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 min-h-0 border-t border-l rounded-lg overflow-hidden">
        {calendarDays.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const visible = dayTasks.slice(0, MAX_VISIBLE_PER_DAY);
          const hiddenCount = dayTasks.length - MAX_VISIBLE_PER_DAY;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r min-h-[90px] p-1 flex flex-col text-xs",
                !isCurrentMonth && "bg-muted/30 opacity-60",
                isTodayDate && "bg-primary/5"
              )}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full font-medium leading-none",
                    isTodayDate
                      ? "bg-primary text-primary-foreground text-[11px]"
                      : "text-foreground/80"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visible.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={cn(
                      "truncate rounded border px-1 py-0.5 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-80",
                      task.is_done ? "opacity-50 line-through" : "",
                      PRIORITY_CLASSES[task.priority] ?? "bg-muted text-foreground border-border"
                    )}
                    title={task.title}
                  >
                    {task.title}
                  </button>
                ))}

                {hiddenCount > 0 && (
                  <button
                    onClick={() => setOverflowDay(day)}
                    className="rounded px-1 py-0.5 text-left text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 flex-shrink-0">
        {(["high", "medium", "low"] as const).map((p) => (
          <div key={p} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-full", PRIORITY_DOT[p])} />
            <span className="capitalize">{p}</span>
          </div>
        ))}
        <span className="text-[11px] text-muted-foreground ml-auto opacity-60">
          Tasks shown on their due date
        </span>
      </div>

      {/* Overflow popover — list all tasks for that day */}
      {overflowDay && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          onClick={() => setOverflowDay(null)}
        >
          <div
            className="z-50 w-72 rounded-xl border bg-card shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                <CalendarDays className="inline mr-1.5 h-4 w-4 text-primary" />
                {format(overflowDay, "MMMM d, yyyy")}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setOverflowDay(null)}
              >
                ×
              </Button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {overflowTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    setOverflowDay(null);
                    setSelectedTask(task);
                  }}
                  className={cn(
                    "truncate rounded border px-2 py-1 text-left text-xs font-medium transition-opacity hover:opacity-80 w-full",
                    task.is_done ? "opacity-50 line-through" : "",
                    PRIORITY_CLASSES[task.priority] ?? "bg-muted text-foreground border-border"
                  )}
                >
                  {task.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task detail dialog */}
      {selectedTask && (
        <TaskDetailDialog
          boardId={boardId}
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdate={(updates) => {
            onUpdateTask(selectedTask.id, updates);
            setSelectedTask(null);
          }}
          onDelete={() => {
            onDeleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
