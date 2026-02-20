import { supabase } from "@/integrations/supabase/client";
import type { TaskComment, CommentCategory } from "@/hooks/useTaskComments";

export const commentService = {
  async getCommentsByTask(taskId: string): Promise<TaskComment[]> {
    const { data, error } = await supabase
      .from("task_comments")
      .select("*, profile:profiles(display_name, avatar_url)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as TaskComment[];
  },

  async addComment(taskId: string, userId: string, content: string, category: CommentCategory) {
    const { error } = await supabase.from("task_comments").insert({
      task_id: taskId,
      user_id: userId,
      content,
      category,
    });
    if (error) throw error;
  },

  async deleteComment(commentId: string) {
    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", commentId);
    if (error) throw error;
  },

  async editComment(id: string, content: string, category: CommentCategory) {
    const { error } = await supabase
      .from("task_comments")
      .update({ content, category })
      .eq("id", id);
    if (error) throw error;
  },
};
