import { hashPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { createPasswordToken } from "../users/invite.js";
import {
  createUser,
  disableUser,
  setPasswordByAdmin,
  updateUser,
} from "../users/repository.js";
import type {
  CreateCandidateInput,
  UpdateCandidateInput,
} from "./schemas.js";

const candidateInclude = {
  user: {
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

export function listCandidates(employeeId?: string) {
  return prisma.candidate.findMany({
    where: employeeId
      ? { assignments: { some: { employeeId } } }
      : undefined,
    include: candidateInclude,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Resolve a route parameter that may be either a Candidate UUID or its short
 * numeric code, returning the UUID (or null when unknown).
 */
export async function resolveCandidateId(idOrCode: string): Promise<string | null> {
  if (/^\d{1,9}$/.test(idOrCode)) {
    const found = await prisma.candidate.findUnique({
      where: { code: Number(idOrCode) },
      select: { id: true },
    });
    return found?.id ?? null;
  }
  return idOrCode;
}

export function findCandidate(id: string) {
  return prisma.candidate.findUnique({
    where: { id },
    include: candidateInclude,
  });
}

export async function createCandidate(data: CreateCandidateInput) {
  // Hash outside the transaction: argon2 is deliberately slow.
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  return prisma.$transaction(async (tx) => {
    const user = await createUser(tx, {
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: "CANDIDATE",
      passwordHash,
    });
    const candidate = await tx.candidate.create({
      data: {
        userId: user.id,
        email: data.contactEmail,
        phone: data.phone,
        gender: data.gender,
        address: data.address,
        primaryRole: data.primaryRole,
        experience: data.experience,
      },
      include: candidateInclude,
    });
    // No invite link when the admin already set a password.
    const rawToken = passwordHash ? null : await createPasswordToken(tx, user.id, "INVITE");
    return { candidate, rawToken };
  });
}

export async function updateCandidate(
  id: string,
  data: UpdateCandidateInput,
) {
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  return prisma.$transaction(async (tx) => {
    const current = await tx.candidate.findUnique({ where: { id } });
    if (!current) return null;
    if (passwordHash) await setPasswordByAdmin(tx, current.userId, passwordHash);

    const userFields: {
      name?: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string;
    } = {};
    if (data.name !== undefined) userFields.name = data.name;
    if (data.firstName !== undefined) userFields.firstName = data.firstName;
    if (data.lastName !== undefined) userFields.lastName = data.lastName;
    if (data.email !== undefined) userFields.email = data.email;
    if (Object.keys(userFields).length > 0) {
      await updateUser(tx, current.userId, userFields);
    }
    return tx.candidate.update({
      where: { id },
      data: {
        email: data.contactEmail,
        phone: data.phone,
        gender: data.gender,
        address: data.address,
        primaryRole: data.primaryRole,
        experience: data.experience,
      },
      include: candidateInclude,
    });
  });
}

export async function disableCandidate(id: string) {
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.findUnique({ where: { id } });
    if (!candidate) return null;
    await disableUser(tx, candidate.userId);
    return tx.candidate.findUnique({
      where: { id },
      include: candidateInclude,
    });
  });
}

export async function createCandidateResetToken(id: string) {
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.findUnique({
      where: { id },
      include: candidateInclude,
    });
    if (!candidate) return null;

    await tx.session.updateMany({
      where: { userId: candidate.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const rawToken = await createPasswordToken(tx, candidate.userId, "RESET");
    return { candidate, rawToken };
  });
}
