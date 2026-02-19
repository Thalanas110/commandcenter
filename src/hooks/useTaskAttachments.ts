import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaskAttachment {
    id: string;
    task_id: string;
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_at: string;
    created_by: string;
}

export function useTaskAttachments(taskId: string) {
    const queryClient = useQueryClient();

    const attachmentsQuery = useQuery({
        queryKey: ["attachments", taskId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("task_attachments")
                .select("*")
                .eq("task_id", taskId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as TaskAttachment[];
        },
        enabled: !!taskId,
    });

    const uploadAttachment = useMutation({
        mutationFn: async (file: File) => {
            const ext = file.name.split(".").pop();
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const filePath = `${taskId}/${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from("task-attachments")
                .upload(filePath, file);
            if (uploadError) throw uploadError;

            // 2. Insert into DB
            const { error: dbError } = await supabase.from("task_attachments").insert({
                task_id: taskId,
                file_path: filePath,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
            });
            if (dbError) throw dbError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
            // Also invalidate tasks to update the attachment count indicator (if we implement that)
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });

    const deleteAttachment = useMutation({
        mutationFn: async (attachment: TaskAttachment) => {
            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from("task-attachments")
                .remove([attachment.file_path]);
            if (storageError) throw storageError;

            // 2. Delete from DB
            const { error: dbError } = await supabase
                .from("task_attachments")
                .delete()
                .eq("id", attachment.id);
            if (dbError) throw dbError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });

    return {
        attachments: attachmentsQuery.data ?? [],
        isLoading: attachmentsQuery.isLoading,
        uploadAttachment,
        deleteAttachment,
    };
}
