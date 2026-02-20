import { useQuery } from "@tanstack/react-query";
import { userRoleService } from "@/services/userRoleService";
import { useAuth } from "./useAuth";

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();

  const { data: roles, isLoading: queryLoading, error, isError } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return userRoleService.getRolesForUser(user.id);
    },
    enabled: !!user && !authLoading,
  });

  return {
    roles: roles ?? [],
    isAdmin: roles?.includes("admin") ?? false,
    isLoading: queryLoading || authLoading,
    error,
    isError
  };
}
