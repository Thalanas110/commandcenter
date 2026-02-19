import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();

  const { data: roles, isLoading: queryLoading, error, isError } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // console.log("Fetching roles for user:", user.id);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        // console.error("Error fetching roles:", error);
        throw error;
      }

      // console.log("Fetched roles:", data);
      return data.map((r) => r.role);
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
