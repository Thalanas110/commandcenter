import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading, isError, error } = useUserRole();

  // console.log("AdminRoute debug:", { 
  //   authLoading, 
  //   roleLoading, 
  //   isAdmin, 
  //   userId: user?.id, 
  //   isError, 
  //   error 
  // });

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center text-destructive">
        Error loading permissions: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!user) {
    // console.log("AdminRoute: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // console.log("AdminRoute: Not admin, redirecting to home");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
