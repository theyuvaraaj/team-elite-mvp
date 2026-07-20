import { createHash, randomBytes } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { config } from "../config.js";
import { prisma } from "./prisma.js";

export const COOKIE_NAME = "te_session";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  candidateId?: string;
  employeeId?: string;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createSession(
  userId: string,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + config.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export async function resolveSession(
  rawToken: string,
): Promise<AuthUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      user: {
        include: {
          candidate: { select: { id: true } },
          employee: { select: { id: true } },
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt !== null ||
    session.expiresAt <= new Date() ||
    !session.user.isActive
  ) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    isActive: session.user.isActive,
    ...(session.user.candidate
      ? { candidateId: session.user.candidate.id }
      : {}),
    ...(session.user.employee ? { employeeId: session.user.employee.id } : {}),
  };
}

export async function revokeSession(rawToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: {
      tokenHash: hashToken(rawToken),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}
