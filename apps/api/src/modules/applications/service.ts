import type { Application } from "@prisma/client";
import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import type { AuthUser } from "../../lib/session.js";
import { assertEmployeeAssigned } from "../assignments/service.js";
import * as repository from "./repository.js";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from "./schemas.js";
import {
  toCandidateApplication,
  toStaffApplication,
} from "./serializers.js";

function employeeId(user: AuthUser): string {
  if (!user.employeeId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Employee profile is not linked to this account",
    );
  }
  return user.employeeId;
}

function candidateId(user: AuthUser): string {
  if (!user.candidateId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Candidate profile is not linked to this account",
    );
  }
  return user.candidateId;
}

async function assertCanRead(
  user: AuthUser,
  application: Pick<Application, "candidateId">,
): Promise<void> {
  if (user.role === "CANDIDATE") {
    if (application.candidateId !== candidateId(user)) {
      throw new AppError(403, "FORBIDDEN", "Application access denied");
    }
    return;
  }
  if (user.role === "EMPLOYEE") {
    await assertEmployeeAssigned(employeeId(user), application.candidateId);
  }
}

async function assertCanMutate(
  user: AuthUser,
  applicationCandidateId: string,
): Promise<void> {
  if (user.role === "EMPLOYEE") {
    await assertEmployeeAssigned(employeeId(user), applicationCandidateId);
    return;
  }
  if (user.role !== "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Application mutation denied");
  }
}

function serialize(user: AuthUser, application: Application) {
  return user.role === "CANDIDATE"
    ? toCandidateApplication(application)
    : toStaffApplication(application);
}

export async function listApplications(user: AuthUser) {
  const applications = await repository.listApplications(
    user.role === "CANDIDATE"
      ? { candidateId: candidateId(user) }
      : user.role === "EMPLOYEE"
        ? { employeeId: employeeId(user) }
        : {},
  );
  return applications.map((application) => serialize(user, application));
}

export async function getApplication(id: string, user: AuthUser) {
  const application = await repository.findApplication(id);
  if (!application) {
    throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found");
  }
  await assertCanRead(user, application);
  return serialize(user, application);
}

export async function createApplication(
  data: CreateApplicationInput,
  user: AuthUser,
) {
  await assertCanMutate(user, data.candidateId);
  if (!(await repository.candidateExists(data.candidateId))) {
    throw new AppError(404, "CANDIDATE_NOT_FOUND", "Candidate not found");
  }
  const application = await repository.createApplication(
    data,
    user.role === "EMPLOYEE" ? user.id : undefined,
  );
  await audit.log({
    userId: user.id,
    action: "APPLICATION_CREATED",
    entity: "Application",
    entityId: application.id,
  });
  return toStaffApplication(application);
}

export async function updateApplication(
  id: string,
  data: UpdateApplicationInput,
  user: AuthUser,
) {
  const current = await repository.findApplication(id);
  if (!current) {
    throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found");
  }
  await assertCanMutate(user, current.candidateId);
  const application = await repository.updateApplication(id, data);
  await audit.log({
    userId: user.id,
    action: "APPLICATION_UPDATED",
    entity: "Application",
    entityId: id,
  });
  return toStaffApplication(application);
}

export async function deleteApplication(id: string, user: AuthUser) {
  const current = await repository.findApplication(id);
  if (!current) {
    throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found");
  }
  await assertCanMutate(user, current.candidateId);
  await repository.deleteApplication(id);
  await audit.log({
    userId: user.id,
    action: "APPLICATION_DELETED",
    entity: "Application",
    entityId: id,
  });
}
