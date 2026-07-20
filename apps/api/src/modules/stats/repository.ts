import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

function startOfToday(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(): Date {
  const date = startOfToday();
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date;
}

export async function getCandidateStats(candidateId: string) {
  const scope: Prisma.ApplicationWhereInput = { candidateId };
  const [total, thisWeek] = await prisma.$transaction([
    prisma.application.count({ where: scope }),
    prisma.application.count({
      where: { ...scope, appliedDate: { gte: startOfWeek() } },
    }),
  ]);

  return { total, thisWeek, interviewsPlaceholder: 0 };
}

export async function getEmployeeStats(employeeId: string) {
  const applicationScope: Prisma.ApplicationWhereInput = {
    candidate: { assignments: { some: { employeeId } } },
  };
  const [assignedCandidates, applicationsToday] = await prisma.$transaction([
    prisma.assignment.count({ where: { employeeId } }),
    prisma.application.count({
      where: {
        ...applicationScope,
        appliedDate: { gte: startOfToday() },
      },
    }),
  ]);

  return { assignedCandidates, applicationsToday };
}

export async function getAdminStats() {
  const [
    totalCandidates,
    totalEmployees,
    applicationsToday,
    activeAssignments,
  ] = await prisma.$transaction([
    prisma.candidate.count(),
    prisma.employee.count(),
    prisma.application.count({
      where: { appliedDate: { gte: startOfToday() } },
    }),
    prisma.assignment.count(),
  ]);

  return {
    totalCandidates,
    totalEmployees,
    applicationsToday,
    activeAssignments,
  };
}
