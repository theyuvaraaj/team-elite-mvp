import { z } from "zod";

export const createAssignmentSchema = z.object({
  employeeId: z.string().uuid(),
  candidateId: z.string().uuid(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
