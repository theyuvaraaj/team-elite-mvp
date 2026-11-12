import type { Prisma, UserRole } from "@prisma/client";

export interface CreateUserData {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: UserRole;
  /** Set when an admin chose the password at invite time. */
  passwordHash?: string | null;
}

export async function createUser(
  tx: Prisma.TransactionClient,
  data: CreateUserData,
) {
  return tx.user.create({ data });
}

export async function updateUser(
  tx: Prisma.TransactionClient,
  id: string,
  data: { name?: string; firstName?: string | null; lastName?: string | null; email?: string },
) {
  return tx.user.update({ where: { id }, data });
}

export async function disableUser(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<void> {
  const now = new Date();
  await tx.user.update({ where: { id }, data: { isActive: false } });
  await tx.session.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: now },
  });
}

/**
 * Apply a password an admin chose for someone else. Any outstanding invite or
 * reset link stops working and the user is signed out everywhere, so the old
 * credentials and links cannot be used after the change.
 */
export async function setPasswordByAdmin(
  tx: Prisma.TransactionClient,
  userId: string,
  passwordHash: string,
): Promise<void> {
  const now = new Date();
  await tx.user.update({ where: { id: userId }, data: { passwordHash } });
  await tx.passwordToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: now },
  });
  await tx.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
}
