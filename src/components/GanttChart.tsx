import { useMemo, useState } from "react";
import {
  addDays,
  differenceInDays,
  format,
  startOfDay,
  isWeekend,
  isSameDay,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { GanttTask } from "@/hooks/useKPIs";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GanttChartProps {
  tasks: GanttTask[];
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const PRIORITY_DONE_COLORS: Record<string, string> = {
  high: "bg-red-300",
  medium: "bg-amber-300",
  low: "bg-emerald-300",
};

const ROW_HEIGHT = 40;
const LABEL_WIDTH = 180;
const DAY_WIDTH = 32;
const MIN_BAR_WIDTH = DAY_WIDTH;

export function GanttChart({ tasks }: GanttChartProps) {
  const today = startOfDay(new Date());

  // Compute date range
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const s = addDays(today, -3);
      const e = addDays(today, 27);
      return {
        startDate: s,
        endDate: e,
        totalDays: differenceInDays(e, s) + 1,
      };
    }
    const allDates = tasks.flatMap((t) => [t.start, t.end]);
    const minDate = addDays(
      new Date(Math.min(...allDates.map((d) => d.getTime()))),
      -3
    );
    const maxDate = addDays(
      new Date(Math.max(...allDates.map((d) => d.getTime()))),
      3
    );
    return {
      startDate: startOfDay(minDate),
      endDate: startOfDay(maxDate),
      totalDays: differenceInDays(maxDate, minDate) + 1,
    };
  }, [tasks, today]);

  const dayLabels = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => addDays(startDate, i));
  }, [startDate, totalDays]);

  const todayOffset = differenceInDays(today, startDate);

  const getBarStyle = (task: GanttTask) => {
    const s = startOfDay(task.start);
    const e = startOfDay(task.end);
    const left = differenceInDays(s, startDate) * DAY_WIDTH;
    const width = Math.max(
      (differenceInDays(e, s) + 1) * DAY_WIDTH,
      MIN_BAR_WIDTH
    );
    return { left, width };
  };

  const isOverdue = (task: GanttTask) =>
    !task.isDone && task.end < today;

  if (tasks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
        No tasks with due dates found. Add due dates to tasks to see them on the Gantt chart.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full overflow-hidden rounded-lg border bg-card">
        {/* Header row */}
        <div className="flex border-b bg-muted/40">
          {/* Task label column header */}
          <div
            className="shrink-0 border-r px-3 py-2 text-xs font-semibold text-muted-foreground"
            style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
          >
            Task
          </div>
          {/* Timeline header — scrollable */}
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div
              className="flex"
              style={{ width: totalDays * DAY_WIDTH }}
            >
              {dayLabels.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex shrink-0 items-center justify-center border-r py-2 text-[10px] font-medium",
                    isWeekend(d) && "bg-muted/60",
                    isSameDay(d, today) &&
                      "bg-primary/10 font-bold text-primary"
                  )}
                  style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                >
                  {d.getDate() === 1 || i === 0
                    ? format(d, "MMM d")
                    : d.getDate() % 5 === 0
                    ? format(d, "d")
                    : ""}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body: labels + bars */}
        <ScrollArea className="max-h-[420px]">
          <div>
            {tasks.map((task, rowIdx) => {
              const { left, width } = getBarStyle(task);
              const over = isOverdue(task);
              const colorClass = task.isDone
                ? PRIORITY_DONE_COLORS[task.priority]
                : over
                ? "bg-red-500"
                : PRIORITY_COLORS[task.priority];

              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex border-b last:border-b-0",
                    rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20"
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Task label */}
                  <div
                    className="flex shrink-0 items-center gap-1.5 border-r px-3 text-xs"
                    style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                  >
                    {task.isDone ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                    ) : over ? (
                      <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
                    ) : (
                      <Circle className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate" title={task.title}>
                      {task.title}
                    </span>
                  </div>

                  {/* Timeline row */}
                  <div className="relative min-w-0 flex-1 overflow-x-auto">
                    {/* Weekend shading */}
                    <div
                      className="absolute inset-0 flex"
                      style={{ width: totalDays * DAY_WIDTH }}
                    >
                      {dayLabels.map((d, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-full border-r shrink-0",
                            isWeekend(d) && "bg-muted/40",
                            isSameDay(d, today) && "bg-primary/5"
                          )}
                          style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                        />
                      ))}
                    </div>

                    {/* Today line */}
                    {todayOffset >= 0 && todayOffset < totalDays && (
                      <div
                        className="absolute top-0 z-10 h-full w-0.5 bg-primary/60"
                        style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                      />
                    )}

                    {/* Task bar */}
                    <div
                      className="absolute inset-0 flex items-center"
                      style={{ width: totalDays * DAY_WIDTH }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute z-20 flex h-6 cursor-pointer items-center rounded px-1.5 text-[10px] font-medium text-white shadow-sm transition-opacity hover:opacity-90",
                              colorClass,
                              task.isDone && "opacity-70"
                            )}
                            style={{ left, width }}
                            title={task.title}
                          >
                            <span className="truncate">{task.title}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold">{task.title}</p>
                            <p>
                              <span className="text-muted-foreground">Status: </span>
                              {task.isDone
                                ? "Done"
                                : over
                                ? "Overdue"
                                : task.columnName}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Priority: </span>
                              <span className="capitalize">{task.priority}</span>
                            </p>
                            {task.assignee && (
                              <p>
                                <span className="text-muted-foreground">Assigned: </span>
                                {task.assignee}
                              </p>
                            )}
                            <p>
                              <span className="text-muted-foreground">Start: </span>
                              {format(task.start, "MMM d, yyyy")}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Due: </span>
                              {format(task.end, "MMM d, yyyy")}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-t px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">Legend:</span>
          {[
            { label: "High priority", cls: "bg-red-500" },
            { label: "Medium", cls: "bg-amber-500" },
            { label: "Low", cls: "bg-emerald-500" },
            { label: "Overdue", cls: "bg-red-500 opacity-100" },
            { label: "Done", cls: "bg-emerald-300" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={cn("h-3 w-5 rounded", l.cls)} />
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-0.5 bg-primary/60" />
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
