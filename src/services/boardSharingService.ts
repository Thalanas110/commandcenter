import { supabase } from "@/integrations/supabase/client";
import type { BoardMember, BoardInvite } from "@/hooks/useBoardSharing";

type BoardShareRow = {
  shared_with_user_id: string;
  permission: "viewer" | "editor";
  created_at: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

export const boardSharingService = {
  async getMembersByBoard(boardId: string): Promise<BoardMember[]> {
    const { data, error } = await supabase
      .from("board_shares")
      .select(`
        shared_with_user_id,
        permission,
        created_at,
        profiles:shared_with_user_id (
          display_name,
          avatar_url
        )
      `)
      .eq("board_id", boardId);
    if (error) throw error;

    const rows = (data ?? []) as unknown[];
    return (rows as BoardShareRow[]).map((item) => ({
      user_id: item.shared_with_user_id,
      display_name: item.profiles?.display_name || "Unknown User",
      avatar_url: item.profiles?.avatar_url,
      email: null,
      role: item.permission as "viewer" | "editor",
      joined_at: item.created_at,
    })) as BoardMember[];
  },

  async getInvitesByBoard(boardId: string): Promise<BoardInvite[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("board_invites")
      .select("*")
      .eq("board_id", boardId);
    if (error) throw error;
    return (data ?? []) as BoardInvite[];
  },

  async createInvite(boardId: string, role: "viewer" | "editor" = "viewer") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("board_invites")
      .insert({ board_id: boardId, role })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeMember(boardId: string, userId: string) {
    const { error } = await supabase
      .from("board_shares")
      .delete()
      .eq("board_id", boardId)
      .eq("shared_with_user_id", userId);
    if (error) throw error;
  },

  async updateMemberRole(boardId: string, userId: string, newRole: "viewer" | "editor") {
    const { error } = await supabase
      .from("board_shares")
      .update({ permission: newRole })
      .eq("board_id", boardId)
      .eq("shared_with_user_id", userId);
    if (error) throw error;
  },

  async joinBoardViaToken(token: string) {
    const { data, error } = await supabase.rpc("join_board_via_token", { _token: token });
    if (error) throw error;
    return data;
  },
};
