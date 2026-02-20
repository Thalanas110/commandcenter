import { supabase } from "@/integrations/supabase/client";

export const userRoleService = {
  async getRolesForUser(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw error;
    return data.map((r) => r.role);
  },

  async getAllUserRoles(): Promise<Array<{ user_id: string; role: string }>> {
    const { data } = await supabase.from("user_roles").select("*");
    return (data ?? []) as Array<{ user_id: string; role: string }>;
  },

  async grantAdmin(userId: string) {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) throw error;
  },

  async revokeAdmin(userId: string) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");
    if (error) throw error;
  },
};
