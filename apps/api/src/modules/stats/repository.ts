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

// MVP heuristic: null/empty updates or updates containing "pending" are pending.
// Keep this centralized so a future status field can replace it without API changes.
const pendingWhere: Prisma.ApplicationWhereInput = {
  OR: [
    { updates: null },
    { updates: "" },
    { updates: { contains: "pending", mode: "insensitive" } },
  ],
};

export async function getCandidateStats(candidateId: string) {
  const scope: Prisma.ApplicationWhereInput = { candidateId };
  const [total, thisWeek, pending] = await prisma.$transaction([
    prisma.application.count({ where: scope }),
    prisma.application.count({
      where: { ...scope, appliedDate: { gte: startOfWeek() } },
    }),
    prisma.application.count({ where: { AND: [scope, pendingWhere] } }),
  ]);

  return { total, thisWeek, interviewsPlaceholder: 0, pending };
}

export async function getEmployeeStats(employeeId: string) {
  const applicationScope: Prisma.ApplicationWhereInput = {
    candidate: { assignments: { some: { employeeId } } },
  };
  const [assignedCandidates, applicationsToday, pending] =
    await prisma.$transaction([
      prisma.assignment.count({ where: { employeeId } }),
      prisma.application.count({
        where: {
          ...applicationScope,
          appliedDate: { gte: startOfToday() },
        },
      }),
      prisma.application.count({
        where: { AND: [applicationScope, pendingWhere] },
      }),
    ]);

  return { assignedCandidates, applicationsToday, pending };
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
