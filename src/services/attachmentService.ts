import { supabase } from "@/integrations/supabase/client";
import type { TaskAttachment } from "@/hooks/useTaskAttachments";

export const attachmentService = {
  async getAttachmentsByTask(taskId: string): Promise<TaskAttachment[]> {
    const { data, error } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as TaskAttachment[];
  },

  async uploadAttachment(taskId: string, file: File) {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = `${taskId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase.from("task_attachments").insert({
      task_id: taskId,
      file_path: filePath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    });
    if (dbError) throw dbError;
  },

  async deleteAttachment(attachment: TaskAttachment) {
    const { error: storageError } = await supabase.storage
      .from("task-attachments")
      .remove([attachment.file_path]);
    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", attachment.id);
    if (dbError) throw dbError;
  },

  getAttachmentPublicUrl(filePath: string): string {
    return supabase.storage.from("task-attachments").getPublicUrl(filePath).data.publicUrl;
  },
};
