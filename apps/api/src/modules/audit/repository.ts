import { prisma } from "../../lib/prisma.js";

export async function listAuditLogs(page: number, pageSize: number) {
  const [auditLogs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.auditLog.count(),
  ]);

  return {
    auditLogs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
