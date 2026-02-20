import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
  TrendingUp,
  Users,
  LayoutList,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, differenceInDays } from "date-fns";
import type {
  KPISummary,
  TasksByColumn,
  TasksByPriority,
  TasksByMember,
  CompletionTrend,
} from "@/hooks/useKPIs";
import type { KPITaskRecord } from "@/services/kpiService";
import { cn } from "@/lib/utils";

interface KPISummaryCardsProps {
  summary: KPISummary;
  tasksByColumn: TasksByColumn[];
  tasksByPriority: TasksByPriority[];
  tasksByMember: TasksByMember[];
  completionTrend: CompletionTrend[];
  overdueDetails: KPITaskRecord[];
}

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}
function StatCard({ title, value, sub, icon, accent }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-full p-2", accent)}>{icon}</div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
interface TooltipPayload {
  name: string;
  value: number;
  color?: string;
}
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-md text-xs space-y-1">
      {label && <p className="font-semibold text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {p.color && (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
          )}
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function KPISummaryCards({
  summary,
  tasksByColumn,
  tasksByPriority,
  tasksByMember,
  completionTrend,
  overdueDetails,
}: KPISummaryCardsProps) {
  const today = new Date();

  return (
    <div className="space-y-6 pb-6">
      {/* ── Summary stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Total Tasks"
          value={summary.total}
          icon={<ListTodo className="h-4 w-4 text-blue-600" />}
          accent="bg-blue-100 dark:bg-blue-900/40"
        />
        <StatCard
          title="Done"
          value={summary.done}
          sub={`${summary.completionRate}% completion`}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          accent="bg-emerald-100 dark:bg-emerald-900/40"
        />
        <StatCard
          title="In Progress"
          value={summary.inProgress}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          accent="bg-amber-100 dark:bg-amber-900/40"
        />
        <StatCard
          title="Overdue"
          value={summary.overdue}
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          accent="bg-red-100 dark:bg-red-900/40"
        />
        <StatCard
          title="Completion"
          value={`${summary.completionRate}%`}
          sub={`${summary.done} of ${summary.total} tasks`}
          icon={<TrendingUp className="h-4 w-4 text-violet-600" />}
          accent="bg-violet-100 dark:bg-violet-900/40"
          />
      </div>

      {/* ── Row 1: Tasks by column + Tasks by priority ──────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Tasks by column */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <LayoutList className="h-4 w-4 text-muted-foreground" />
              Tasks by Column
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {tasksByColumn.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={tasksByColumn}
                  margin={{ top: 4, right: 8, left: -12, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                    {tasksByColumn.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tasks by priority */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Tasks by Priority
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 flex flex-col items-center justify-center">
            {tasksByPriority.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={tasksByPriority}
                    dataKey="count"
                    nameKey="priority"
                    cx="50%"
                    cy="45%"
                    outerRadius={75}
                    label={({ priority, percent }) =>
                      `${priority} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {tasksByPriority.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => (
                      <span className="text-xs capitalize">{v}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Completion trend + Tasks by member ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Completion trend */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Completion Trend (6 weeks)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={completionTrend}
                margin={{ top: 4, right: 8, left: -12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-xs capitalize">{v}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="done"
                  name="Done"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="created"
                  name="Due"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  strokeDasharray="5 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks by member */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" />
              Tasks by Member
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {tasksByMember.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={tasksByMember}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 56, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={56}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span className="text-xs capitalize">{v}</span>}
                  />
                  <Bar
                    dataKey="doneCount"
                    name="Done"
                    stackId="a"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="count"
                    name="Total"
                    stackId="b"
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Overdue tasks table ────────────────────────────────────────────── */}
      {overdueDetails.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/60">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Overdue Tasks ({overdueDetails.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-56">
              <div className="space-y-2">
                {overdueDetails.map((t) => {
                  const daysOver = t.due_date
                    ? differenceInDays(today, parseISO(t.due_date))
                    : 0;
                  return (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs dark:border-red-900/40 dark:bg-red-900/10"
                    >
                      <span className="font-medium truncate max-w-[200px]" title={t.title}>
                        {t.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.assignee_profile?.display_name && (
                          <span className="text-muted-foreground">
                            {t.assignee_profile.display_name}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize text-[10px]",
                            t.priority === "high" &&
                              "border-red-400 text-red-600",
                            t.priority === "medium" &&
                              "border-amber-400 text-amber-600",
                            t.priority === "low" &&
                              "border-emerald-400 text-emerald-600"
                          )}
                        >
                          {t.priority}
                        </Badge>
                        <span className="text-red-600 font-semibold">
                          {daysOver}d overdue
                        </span>
                        {t.due_date && (
                          <span className="text-muted-foreground">
                            <Calendar className="inline h-3 w-3 mr-0.5" />
                            {format(parseISO(t.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
