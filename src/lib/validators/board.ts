import { z } from "zod";

export const boardSchema = z.object({
  name: z.string().min(1, "Board name is required").max(100),
});

export const columnSchema = z.object({
  name: z.string().min(1, "Column name is required").max(100),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(2000).optional(),
  due_date: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
});

export const labelSchema = z.object({
  name: z.string().min(1, "Label name is required").max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
});

export type BoardFormValues = z.infer<typeof boardSchema>;
export type ColumnFormValues = z.infer<typeof columnSchema>;
export type TaskFormValues = z.infer<typeof taskSchema>;
export type LabelFormValues = z.infer<typeof labelSchema>;
