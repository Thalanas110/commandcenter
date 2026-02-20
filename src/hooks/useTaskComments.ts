import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CommentCategory = "TASK_UPDATES" | "QUESTIONS" | "GENERAL_COMMENTS";

export const COMMENT_CATEGORIES: {
    value: CommentCategory;
    label: string;
    description: string;
}[] = [
    { value: "TASK_UPDATES", label: "Task Update", description: "Progress or status changes" },
    { value: "QUESTIONS", label: "Question", description: "Ask a question about the task" },
    { value: "GENERAL_COMMENTS", label: "General", description: "General discussion" },
];

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    category: CommentCategory;
    created_at: string;
    updated_at: string;
    profile?: {
        display_name: string | null;
        avatar_url: string | null;
    } | null;
}

export function useTaskComments(taskId: string | undefined) {
    const queryClient = useQueryClient();

    const commentsQuery = useQuery({
        queryKey: ["task_comments", taskId],
        queryFn: async (): Promise<TaskComment[]> => {
            if (!taskId) return [];
            const { data, error } = await supabase
                .from("task_comments")
                .select("*, profile:profiles(display_name, avatar_url)")
                .eq("task_id", taskId)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return (data ?? []) as TaskComment[];
        },
        enabled: !!taskId,
    });

    const addComment = useMutation({
        mutationFn: async ({
            content,
            category,
        }: {
            content: string;
            category: CommentCategory;
        }) => {
            if (!taskId) return;
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const { error } = await supabase.from("task_comments").insert({
                task_id: taskId,
                user_id: user.id,
                content,
                category,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["task_comments", taskId] });
        },
    });

    const deleteComment = useMutation({
        mutationFn: async (commentId: string) => {
            const { error } = await supabase
                .from("task_comments")
                .delete()
                .eq("id", commentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["task_comments", taskId] });
        },
    });

    const editComment = useMutation({
        mutationFn: async ({
            id,
            content,
            category,
        }: {
            id: string;
            content: string;
            category: CommentCategory;
        }) => {
            const { error } = await supabase
                .from("task_comments")
                .update({ content, category })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["task_comments", taskId] });
        },
    });

    return {
        comments: commentsQuery.data ?? [],
        isLoading: commentsQuery.isLoading,
        addComment,
        deleteComment,
        editComment,
    };
}
