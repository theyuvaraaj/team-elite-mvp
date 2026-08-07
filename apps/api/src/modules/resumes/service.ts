import { config } from "../../config.js";
import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import {
  getOptimizer,
  type OptimizeEnhancements,
  type ResumeOptimizer,
} from "./optimizer.js";
import { parseResumeFile, type UploadedFile } from "./parse.js";
import * as repository from "./repository.js";
import { markdownToPlainText } from "./render.js";
import { scoreResume, type ScoreBreakdown } from "./scorer.js";

export interface OptimizeParams {
  candidateId: string;
  createdById: string;
  file: UploadedFile;
  jobDescription: string;
  companyName: string;
  jobTitle?: string | null;
  enhancements?: OptimizeEnhancements;
  optimizer?: ResumeOptimizer;
}

export async function optimizeResume(params: OptimizeParams) {
  const resumeText = await parseResumeFile(params.file);
  const optimizer = params.optimizer ?? getOptimizer();

  let best: { markdown: string; score: number; breakdown: ScoreBreakdown } | null = null;
  let missingKeywords: string[] | undefined;
  let gaps: string[] | undefined;

  for (let pass = 0; pass < config.RESUME_MAX_REFINE_PASSES; pass++) {
    const markdown = await optimizer.optimize({
      resumeText,
      jobDescription: params.jobDescription,
      companyName: params.companyName,
      jobTitle: params.jobTitle,
      enhancements: params.enhancements,
      missingKeywords,
      gaps,
    });
    // Score the text an ATS would extract from the rendered file, not the
    // markdown source (whose ** markers become real bold when rendered).
    const scored = scoreResume(markdownToPlainText(markdown), params.jobDescription, {
      jobTitle: params.jobTitle,
    });
    if (!best || scored.score > best.score) {
      best = { markdown, score: scored.score, breakdown: scored.breakdown };
    }
    if (scored.score >= config.RESUME_SCORE_TARGET) break;
    // Feed the specific, scored shortfalls back into the next pass.
    missingKeywords = scored.missingKeywords;
    gaps = scored.gaps;
  }

  if (!best) throw new AppError(502, "OPTIMIZER_FAILED", "Resume optimization produced no result");

  const stored = await repository.createOptimizedResume({
    candidateId: params.candidateId,
    createdById: params.createdById,
    companyName: params.companyName,
    jobDescription: params.jobDescription,
    contentMarkdown: best.markdown,
    atsScore: best.score,
    scoreBreakdown: best.breakdown,
  });

  await audit.log({
    userId: params.createdById,
    action: "RESUME_OPTIMIZED",
    entity: "OptimizedResume",
    entityId: stored.id,
  });

  return { id: stored.id, atsScore: best.score, scoreBreakdown: best.breakdown };
}

export async function getResumeDetail(candidateId: string, id: string) {
  const resume = await repository.findOptimizedResumeDetail(candidateId, id);
  if (!resume) throw new AppError(404, "RESUME_NOT_FOUND", "Optimized resume not found");
  return resume;
}

export function listResumes(candidateId: string) {
  return repository.listOptimizedResumes(candidateId);
}

export async function getResumeForDownload(candidateId: string, id: string) {
  const resume = await repository.findOptimizedResume(candidateId, id);
  if (!resume) throw new AppError(404, "RESUME_NOT_FOUND", "Optimized resume not found");
  const u = resume.candidate.user;
  const fromParts = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return {
    companyName: resume.companyName,
    contentMarkdown: resume.contentMarkdown,
    // Prefer structured first/last, then the full name; the route falls back
    // to the resume's own name line if this is empty.
    candidateName: fromParts || u.name || "",
  };
}
