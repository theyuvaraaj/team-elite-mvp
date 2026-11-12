import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { hashPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { createPasswordToken, deliverPasswordToken } from "../users/invite.js";
import { createUser, setPasswordByAdmin, updateUser } from "../users/repository.js";
import type { CreateAdminInput, UpdateAdminInput } from "./schemas.js";

// Never select the password hash.
const adminSelect = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  isActive: true,
  createdAt: true,
} as const;

export function listAdmins() {
  return prisma.user.findMany({
    where: { role: "ADMIN" },
    select: adminSelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function createAdmin(
  data: CreateAdminInput,
  actorId: string,
  onInviteError: (error: unknown) => void,
) {
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  const { admin, rawToken } = await prisma.$transaction(async (tx) => {
    const user = await createUser(tx, {
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: "ADMIN",
      passwordHash,
    });
    const token = passwordHash ? null : await createPasswordToken(tx, user.id, "INVITE");
    return { admin: await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: adminSelect }), rawToken: token };
  });

  // Same contract as candidates and employees: the account is saved either
  // way, and a failed email is reported rather than thrown.
  let inviteEmailSent = true;
  try {
    if (rawToken) await deliverPasswordToken({ to: admin.email, name: admin.name, rawToken });
  } catch (error) {
    inviteEmailSent = false;
    onInviteError(error);
  }
  await audit.log({ userId: actorId, action: "ADMIN_CREATED", entity: "User", entityId: admin.id });
  return inviteEmailSent ? admin : { ...admin, inviteEmailSent: false };
}

export async function updateAdmin(id: string, data: UpdateAdminInput, actorId: string) {
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  const admin = await prisma.$transaction(async (tx) => {
    const current = await tx.user.findFirst({ where: { id, role: "ADMIN" } });
    if (!current) return null;
    const fields: { name?: string; firstName?: string | null; lastName?: string | null; email?: string } = {};
    if (data.name !== undefined) fields.name = data.name;
    if (data.firstName !== undefined) fields.firstName = data.firstName;
    if (data.lastName !== undefined) fields.lastName = data.lastName;
    if (data.email !== undefined) fields.email = data.email;
    if (Object.keys(fields).length > 0) await updateUser(tx, id, fields);
    if (passwordHash) await setPasswordByAdmin(tx, id, passwordHash);
    return tx.user.findUniqueOrThrow({ where: { id }, select: adminSelect });
  });
  if (!admin) throw new AppError(404, "ADMIN_NOT_FOUND", "Admin not found");

  await audit.log({ userId: actorId, action: "ADMIN_UPDATED", entity: "User", entityId: id });
  if (passwordHash) {
    await audit.log({ userId: actorId, action: "ADMIN_PASSWORD_SET", entity: "User", entityId: id });
  }
  return admin;
}
