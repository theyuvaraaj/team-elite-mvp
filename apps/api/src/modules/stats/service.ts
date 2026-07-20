import { AppError } from "../../lib/errors.js";
import type { AuthUser } from "../../lib/session.js";
import * as repository from "./repository.js";

export function getCandidateStats(user: AuthUser) {
  if (!user.candidateId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Candidate profile is not linked to this account",
    );
  }
  return repository.getCandidateStats(user.candidateId);
}

export function getEmployeeStats(user: AuthUser) {
  if (!user.employeeId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Employee profile is not linked to this account",
    );
  }
  return repository.getEmployeeStats(user.employeeId);
}

export function getAdminStats() {
  return repository.getAdminStats();
}
