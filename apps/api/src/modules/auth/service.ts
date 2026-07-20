import { createHash } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import type { AuthUser } from "../../lib/session.js";

interface UserWithProfiles {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  candidate: { id: string } | null;
  employee: { id: string } | null;
}

function toAuthUser(user: UserWithProfiles): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    ...(user.candidate ? { candidateId: user.candidate.id } : {}),
    ...(user.employee ? { employeeId: user.employee.id } : {}),
  };
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      candidate: { select: { id: true } },
      employee: { select: { id: true } },
    },
  });

  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(user.passwordHash, password))
  ) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
    );
  }

  if (!user.isActive) {
    throw new AppError(403, "ACCOUNT_DISABLED", "Account is disabled");
  }

  return toAuthUser(user);
}

export async function setPassword(
  rawToken: string,
  password: string,
): Promise<void> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const token = await tx.passwordToken.findUnique({
      where: { tokenHash },
    });

    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new AppError(
        400,
        "INVALID_PASSWORD_TOKEN",
        "Password token is invalid or expired",
      );
    }

    await tx.user.update({
      where: { id: token.userId },
      data: { passwordHash },
    });
    await tx.passwordToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    await tx.session.updateMany({
      where: { userId: token.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId: token.userId,
        action: "PASSWORD_SET",
        entity: "User",
        entityId: token.userId,
      },
    });
  });
}

export interface ProfileDetails {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  candidateId?: string;
  employeeId?: string;
  phone?: string | null;
  gender?: string | null;
  address?: string | null;
  primaryRole?: string | null;
  experience?: string | null;
  contactEmail?: string | null;
  employeeCode?: string | null;
}

export async function getProfile(userId: string): Promise<ProfileDetails> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      candidate: true,
      employee: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ...(user.candidate
      ? {
          candidateId: user.candidate.id,
          phone: user.candidate.phone,
          gender: user.candidate.gender,
          address: user.candidate.address,
          primaryRole: user.candidate.primaryRole,
          experience: user.candidate.experience,
          contactEmail: user.candidate.email,
        }
      : {}),
    ...(user.employee
      ? {
          employeeId: user.employee.id,
          employeeCode: user.employee.employeeCode,
        }
      : {}),
  };
}

export async function updateProfile(
  userId: string,
  input: {
    name?: string;
    phone?: string | null;
    gender?: string | null;
    address?: string | null;
    primaryRole?: string | null;
    experience?: string | null;
    contactEmail?: string | null;
  },
): Promise<ProfileDetails> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidate: true, employee: true },
  });

  if (!user || !user.isActive) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  await prisma.$transaction(async (tx) => {
    if (input.name !== undefined) {
      await tx.user.update({
        where: { id: userId },
        data: { name: input.name },
      });
    }

    if (user.employee && input.name !== undefined) {
      await tx.employee.update({
        where: { id: user.employee.id },
        data: { name: input.name },
      });
    }

    if (user.candidate) {
      const candidateData = {
        ...(input.phone !== undefined ? { phone: emptyToNull(input.phone) } : {}),
        ...(input.gender !== undefined
          ? { gender: emptyToNull(input.gender) }
          : {}),
        ...(input.address !== undefined
          ? { address: emptyToNull(input.address) }
          : {}),
        ...(input.primaryRole !== undefined
          ? { primaryRole: emptyToNull(input.primaryRole) }
          : {}),
        ...(input.experience !== undefined
          ? { experience: emptyToNull(input.experience) }
          : {}),
        ...(input.contactEmail !== undefined
          ? { email: emptyToNull(input.contactEmail) }
          : {}),
      };
      if (Object.keys(candidateData).length > 0) {
        await tx.candidate.update({
          where: { id: user.candidate.id },
          data: candidateData,
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: "PROFILE_UPDATED",
        entity: "User",
        entityId: userId,
      },
    });
  });

  return getProfile(userId);
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
