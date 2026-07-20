import { prisma } from "../../lib/prisma.js";

const assignmentInclude = {
  employee: {
    include: {
      user: {
        select: { id: true, name: true, email: true, isActive: true },
      },
    },
  },
  candidate: {
    include: {
      user: {
        select: { id: true, name: true, email: true, isActive: true },
      },
    },
  },
} as const;

export function listAssignments() {
  return prisma.assignment.findMany({
    include: assignmentInclude,
    orderBy: { assignedAt: "desc" },
  });
}

export function findAssignment(employeeId: string, candidateId: string) {
  return prisma.assignment.findUnique({
    where: { employeeId_candidateId: { employeeId, candidateId } },
  });
}

export function createAssignment(
  employeeId: string,
  candidateId: string,
  assignedBy: string,
) {
  return prisma.assignment.create({
    data: { employeeId, candidateId, assignedBy },
    include: assignmentInclude,
  });
}

export function deleteAssignment(id: string) {
  return prisma.assignment.deleteMany({ where: { id } });
}

export function employeeExists(id: string) {
  return prisma.employee.findUnique({ where: { id }, select: { id: true } });
}

export function candidateExists(id: string) {
  return prisma.candidate.findUnique({ where: { id }, select: { id: true } });
}
