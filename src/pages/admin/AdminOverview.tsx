import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  LayoutDashboard,
  ListTodo,
  Tags,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const weeklyChartConfig: ChartConfig = {
  created: { label: "Created", color: "hsl(var(--chart-1))" },
  completed: { label: "Completed", color: "hsl(var(--chart-2))" },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "hsl(var(--destructive))",
  medium: "hsl(var(--chart-4))",
  low: "hsl(var(--chart-2))",
};

export default function AdminOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-detailed-stats"],
    queryFn: () => adminService.getDetailedStats(),
  });

  const { data: weekly, isLoading: weeklyLoading } = useQuery({
    queryKey: ["admin-weekly-activity"],
    queryFn: () => adminService.getWeeklyActivity(7),
  });

  const priorityData = stats
    ? [
        { name: "High", value: stats.tasksByPriority.high, key: "high" },
        { name: "Medium", value: stats.tasksByPriority.medium, key: "medium" },
        { name: "Low", value: stats.tasksByPriority.low, key: "low" },
      ]
    : [];

  const statCards = [
    {
      title: "Total Users",
      value: stats?.users,
      delta: stats?.newUsersThisWeek,
      deltaLabel: "new this week",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Boards",
      value: stats?.boards,
      delta: null,
      deltaLabel: null,
      icon: LayoutDashboard,
      color: "text-purple-500",
    },
    {
      title: "Total Tasks",
      value: stats?.tasks,
      delta: stats?.newTasksThisWeek,
      deltaLabel: "new this week",
      icon: ListTodo,
      color: "text-orange-500",
    },
    {
      title: "Labels",
      value: stats?.labels,
      delta: null,
      deltaLabel: null,
      icon: Tags,
      color: "text-green-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <p className="text-sm text-muted-foreground">System-wide overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-3xl font-bold">{card.value}</p>
                  {card.delta != null && card.delta > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500 font-medium">+{card.delta}</span>
                      &nbsp;{card.deltaLabel}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion rate + task status row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-3xl font-bold">{stats?.completionRate ?? 0}%</p>
                <Progress
                  value={stats?.completionRate ?? 0}
                  className="mt-2 h-2"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats?.tasksDone} done / {stats?.tasks} total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-orange-500" /> Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{stats?.tasksPending ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-red-500" /> High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-3xl font-bold">{stats?.tasksByPriority.high ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">tasks marked high</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Weekly activity line chart — takes 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Weekly Activity</CardTitle>
            <CardDescription>Tasks created vs completed — last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ChartContainer config={weeklyChartConfig} className="h-48 w-full">
                <LineChart data={weekly} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="created"
                    stroke={weeklyChartConfig.created.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke={weeklyChartConfig.completed.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: weeklyChartConfig.created.color as string }}
                />
                Created
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: weeklyChartConfig.completed.color as string }}
                />
                Completed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tasks by priority horizontal bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks by Priority</CardTitle>
            <CardDescription>Distribution across all tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-3 mt-2">
                {priorityData.map((p) => {
                  const pct =
                    stats && stats.tasks > 0
                      ? Math.round((p.value / stats.tasks) * 100)
                      : 0;
                  return (
                    <div key={p.key}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="capitalize font-medium">{p.name}</span>
                        <span className="text-muted-foreground">
                          {p.value} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: PRIORITY_COLORS[p.key],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {stats?.tasks === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No tasks yet
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

