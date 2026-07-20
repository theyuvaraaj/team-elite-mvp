import { prisma } from "../../lib/prisma.js";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from "./schemas.js";

const applicationInclude = {
  submittedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export function listApplications(scope: {
  candidateId?: string;
  employeeId?: string;
}) {
  return prisma.application.findMany({
    where: scope.candidateId
      ? { candidateId: scope.candidateId }
      : scope.employeeId
        ? {
            candidate: {
              assignments: { some: { employeeId: scope.employeeId } },
            },
          }
        : undefined,
    include: applicationInclude,
    orderBy: [{ appliedDate: "desc" }, { createdAt: "desc" }],
  });
}

export function findApplication(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: applicationInclude,
  });
}

export async function candidateExists(id: string): Promise<boolean> {
  return (
    (await prisma.candidate.count({
      where: { id },
    })) > 0
  );
}

export function createApplication(
  data: CreateApplicationInput,
  submittedById?: string,
) {
  return prisma.application.create({
    data: {
      ...data,
      submittedById,
    },
    include: applicationInclude,
  });
}

export function updateApplication(id: string, data: UpdateApplicationInput) {
  return prisma.application.update({
    where: { id },
    data,
    include: applicationInclude,
  });
}

export function deleteApplication(id: string) {
  return prisma.application.delete({ where: { id } });
}
