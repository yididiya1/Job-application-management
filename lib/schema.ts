import { z } from "zod";

export const BlockPatchSchema = z.object({
  id: z.string().min(1),
  replaceWith: z.array(z.string()).min(1),
});

export const ResumePatchSchema = z.object({
  blocks: z.array(BlockPatchSchema).min(1),
  notes: z.array(z.string()).default([]),
});

// added comment
export type ResumePatch = z.infer<typeof ResumePatchSchema>;
