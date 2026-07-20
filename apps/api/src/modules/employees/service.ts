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
) {
  const { employee, rawToken } = await repository.createEmployee(data);
  await deliverPasswordToken({
    to: employee.user.email,
    name: employee.user.name,
    rawToken,
  });
  await audit.log({
    userId: actorId,
    action: "EMPLOYEE_CREATED",
    entity: "Employee",
    entityId: employee.id,
  });
  return employee;
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
