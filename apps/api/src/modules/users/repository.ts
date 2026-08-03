import type { Prisma, UserRole } from "@prisma/client";

export interface CreateUserData {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: UserRole;
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
