import { Link, Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { cn } from "@/lib/utils";
import { Users, Tags, Activity, LayoutDashboard } from "lucide-react";

const adminNavItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Labels", href: "/admin/labels", icon: Tags },
  { label: "Activity", href: "/admin/activity", icon: Activity },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Mobile/tablet horizontal tab nav (hidden on lg where sidebar takes over) */}
      <div className="border-b bg-card lg:hidden">
        <nav className="container flex overflow-x-auto">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm transition-colors",
                location.pathname === item.href
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="container flex gap-6 py-6">
        {/* Desktop sidebar (lg+) */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="flex flex-col gap-1">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                  location.pathname === item.href
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
