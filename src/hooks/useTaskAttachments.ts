import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attachmentService } from "@/services/attachmentService";

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
            return attachmentService.getAttachmentsByTask(taskId);
        },
        enabled: !!taskId,
    });

    const uploadAttachment = useMutation({
        mutationFn: async (file: File) => {
            await attachmentService.uploadAttachment(taskId, file);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
            // Also invalidate tasks to update the attachment count indicator (if we implement that)
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });

    const deleteAttachment = useMutation({
        mutationFn: async (attachment: TaskAttachment) => {
            await attachmentService.deleteAttachment(attachment);
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
