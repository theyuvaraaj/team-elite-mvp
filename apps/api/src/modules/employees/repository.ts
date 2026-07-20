import { prisma } from "../../lib/prisma.js";
import { createPasswordToken } from "../users/invite.js";
import {
  createUser,
  disableUser,
  updateUser,
} from "../users/repository.js";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "./schemas.js";

const employeeInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

export function listEmployees() {
  return prisma.employee.findMany({
    include: employeeInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function findEmployee(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: employeeInclude,
  });
}

export async function createEmployee(data: CreateEmployeeInput) {
  return prisma.$transaction(async (tx) => {
    const user = await createUser(tx, {
      name: data.name,
      email: data.email,
      role: "EMPLOYEE",
    });
    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        name: data.name,
        employeeCode: data.employeeCode,
      },
      include: employeeInclude,
    });
    const rawToken = await createPasswordToken(tx, user.id, "INVITE");
    return { employee, rawToken };
  });
}

export async function updateEmployee(
  id: string,
  data: UpdateEmployeeInput,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.employee.findUnique({ where: { id } });
    if (!current) return null;

    const userFields: { name?: string; email?: string } = {};
    if (data.name !== undefined) userFields.name = data.name;
    if (data.email !== undefined) userFields.email = data.email;
    if (Object.keys(userFields).length > 0) {
      await updateUser(tx, current.userId, userFields);
    }
    return tx.employee.update({
      where: { id },
      data: {
        name: data.name,
        employeeCode: data.employeeCode,
      },
      include: employeeInclude,
    });
  });
}

export async function disableEmployee(id: string) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id } });
    if (!employee) return null;
    await disableUser(tx, employee.userId);
    return tx.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });
  });
}

export async function createEmployeeResetToken(id: string) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });
    if (!employee) return null;

    await tx.session.updateMany({
      where: { userId: employee.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const rawToken = await createPasswordToken(tx, employee.userId, "RESET");
    return { employee, rawToken };
  });
}
