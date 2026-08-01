import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { ScoreBreakdown } from "./scorer.js";

export function createOptimizedResume(data: {
  candidateId: string; createdById: string; companyName: string;
  jobDescription: string; contentMarkdown: string; atsScore: number; scoreBreakdown: ScoreBreakdown;
}) {
  return prisma.optimizedResume.create({
    data: {
      candidateId: data.candidateId,
      createdById: data.createdById,
      companyName: data.companyName,
      jobDescription: data.jobDescription,
      contentMarkdown: data.contentMarkdown,
      atsScore: data.atsScore,
      scoreBreakdown: data.scoreBreakdown as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, atsScore: true },
  });
}

export function listOptimizedResumes(candidateId: string) {
  return prisma.optimizedResume.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, companyName: true, atsScore: true, createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export function findOptimizedResume(candidateId: string, id: string) {
  return prisma.optimizedResume.findFirst({
    where: { id, candidateId },
    select: { id: true, companyName: true, contentMarkdown: true },
  });
}
