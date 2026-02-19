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
      <div className="container flex gap-6 py-6">
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
