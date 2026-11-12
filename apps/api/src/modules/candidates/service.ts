import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { assertEmployeeAssigned } from "../assignments/service.js";
import { deliverPasswordToken } from "../users/invite.js";
import * as repository from "./repository.js";
import type {
  CreateCandidateInput,
  UpdateCandidateInput,
} from "./schemas.js";

export function listCandidates(employeeId?: string) {
  return repository.listCandidates(employeeId);
}

export async function getCandidate(id: string, employeeId?: string) {
  if (employeeId) {
    await assertEmployeeAssigned(employeeId, id);
  }
  const candidate = await repository.findCandidate(id);
  if (!candidate) {
    throw new AppError(404, "CANDIDATE_NOT_FOUND", "Candidate not found");
  }
  return candidate;
}

export async function createCandidate(
  data: CreateCandidateInput,
  actorId: string,
  onInviteError: (error: unknown) => void,
) {
  const { candidate, rawToken } = await repository.createCandidate(data);
  let inviteEmailSent = true;
  try {
    // rawToken is null when the admin set the password: nothing to email.
    if (rawToken) await deliverPasswordToken({
      to: candidate.user.email,
      name: candidate.user.name,
      rawToken,
    });
  } catch (error) {
    inviteEmailSent = false;
    onInviteError(error);
  }
  await audit.log({
    userId: actorId,
    action: "CANDIDATE_CREATED",
    entity: "Candidate",
    entityId: candidate.id,
  });
  return inviteEmailSent ? candidate : { ...candidate, inviteEmailSent: false };
}

export async function updateCandidate(
  id: string,
  data: UpdateCandidateInput,
  actorId: string,
) {
  const candidate = await repository.updateCandidate(id, data);
  if (!candidate) {
    throw new AppError(404, "CANDIDATE_NOT_FOUND", "Candidate not found");
  }
  if (data.password) {
    await audit.log({
      userId: actorId,
      action: "CANDIDATE_PASSWORD_SET",
      entity: "Candidate",
      entityId: id,
    });
  }
  await audit.log({
    userId: actorId,
    action: "CANDIDATE_UPDATED",
    entity: "Candidate",
    entityId: id,
  });
  return candidate;
}

export async function disableCandidate(id: string, actorId: string) {
  const candidate = await repository.disableCandidate(id);
  if (!candidate) {
    throw new AppError(404, "CANDIDATE_NOT_FOUND", "Candidate not found");
  }
  await audit.log({
    userId: actorId,
    action: "CANDIDATE_DISABLED",
    entity: "Candidate",
    entityId: id,
  });
  return candidate;
}

export async function resetCandidatePassword(id: string, actorId: string) {
  const result = await repository.createCandidateResetToken(id);
  if (!result) {
    throw new AppError(404, "CANDIDATE_NOT_FOUND", "Candidate not found");
  }
  await deliverPasswordToken({
    to: result.candidate.user.email,
    name: result.candidate.user.name,
    rawToken: result.rawToken,
  });
  await audit.log({
    userId: actorId,
    action: "CANDIDATE_PASSWORD_RESET_REQUESTED",
    entity: "Candidate",
    entityId: id,
  });
  return { ok: true };
}
