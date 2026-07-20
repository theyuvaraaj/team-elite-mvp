import { Prisma } from "@prisma/client";
import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import * as repository from "./repository.js";
import type { CreateAssignmentInput } from "./schemas.js";

export function listAssignments() {
  return repository.listAssignments();
}

export async function createAssignment(
  data: CreateAssignmentInput,
  actorId: string,
) {
  const [employee, candidate, existing] = await Promise.all([
    repository.employeeExists(data.employeeId),
    repository.candidateExists(data.candidateId),
    repository.findAssignment(data.employeeId, data.candidateId),
  ]);
  if (!employee) {
    throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  }
  if (!candidate) {
    throw new AppError(404, "CANDIDATE_NOT_FOUND", "Candidate not found");
  }
  if (existing) {
    throw new AppError(409, "ASSIGNMENT_EXISTS", "Assignment already exists");
  }

  try {
    const assignment = await repository.createAssignment(
      data.employeeId,
      data.candidateId,
      actorId,
    );
    await audit.log({
      userId: actorId,
      action: "ASSIGNMENT_CREATED",
      entity: "Assignment",
      entityId: assignment.id,
    });
    return assignment;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "ASSIGNMENT_EXISTS",
        "Assignment already exists",
      );
    }
    throw error;
  }
}

export async function deleteAssignment(id: string, actorId: string) {
  const result = await repository.deleteAssignment(id);
  if (result.count === 0) {
    throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }
  await audit.log({
    userId: actorId,
    action: "ASSIGNMENT_DELETED",
    entity: "Assignment",
    entityId: id,
  });
}

export async function assertEmployeeAssigned(
  employeeId: string,
  candidateId: string,
): Promise<void> {
  const assignment = await repository.findAssignment(employeeId, candidateId);
  if (!assignment) {
    throw new AppError(
      403,
      "CANDIDATE_NOT_ASSIGNED",
      "Candidate is not assigned to this employee",
    );
  }
}
