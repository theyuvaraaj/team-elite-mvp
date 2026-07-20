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
