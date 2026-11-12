import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { deliverPasswordToken } from "../users/invite.js";
import * as repository from "./repository.js";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "./schemas.js";

export function listEmployees() {
  return repository.listEmployees();
}

export async function getEmployee(id: string) {
  const employee = await repository.findEmployee(id);
  if (!employee) {
    throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  }
  return employee;
}

export async function createEmployee(
  data: CreateEmployeeInput,
  actorId: string,
  onInviteError: (error: unknown) => void,
) {
  const { employee, rawToken } = await repository.createEmployee(data);
  // The employee is saved either way. A failed email must not turn into an
  // error, or a retry would hit "already exists"; the admin is told instead
  // and can resend from the Users page.
  let inviteEmailSent = true;
  try {
    // rawToken is null when the admin set the password: nothing to email.
    if (rawToken) await deliverPasswordToken({
      to: employee.user.email,
      name: employee.user.name,
      rawToken,
    });
  } catch (error) {
    inviteEmailSent = false;
    onInviteError(error);
  }
  await audit.log({
    userId: actorId,
    action: "EMPLOYEE_CREATED",
    entity: "Employee",
    entityId: employee.id,
  });
  return inviteEmailSent ? employee : { ...employee, inviteEmailSent: false };
}

export async function updateEmployee(
  id: string,
  data: UpdateEmployeeInput,
  actorId: string,
) {
  const employee = await repository.updateEmployee(id, data);
  if (!employee) {
    throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  }
  if (data.password) {
    await audit.log({
      userId: actorId,
      action: "EMPLOYEE_PASSWORD_SET",
      entity: "Employee",
      entityId: id,
    });
  }
  await audit.log({
    userId: actorId,
    action: "EMPLOYEE_UPDATED",
    entity: "Employee",
    entityId: id,
  });
  return employee;
}

export async function disableEmployee(id: string, actorId: string) {
  const employee = await repository.disableEmployee(id);
  if (!employee) {
    throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  }
  await audit.log({
    userId: actorId,
    action: "EMPLOYEE_DISABLED",
    entity: "Employee",
    entityId: id,
  });
  return employee;
}

export async function resetEmployeePassword(id: string, actorId: string) {
  const result = await repository.createEmployeeResetToken(id);
  if (!result) {
    throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
  }
  await deliverPasswordToken({
    to: result.employee.user.email,
    name: result.employee.user.name,
    rawToken: result.rawToken,
  });
  await audit.log({
    userId: actorId,
    action: "EMPLOYEE_PASSWORD_RESET_REQUESTED",
    entity: "Employee",
    entityId: id,
  });
  return { ok: true };
}
