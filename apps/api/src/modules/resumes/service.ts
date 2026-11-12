import { config } from "../../config.js";
import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import {
  appendMissingSkills,
  getOptimizer,
  type JdSkills,
  type OptimizeEnhancements,
  type ResumeOptimizer,
} from "./optimizer.js";
import { parseResumeFile, type UploadedFile } from "./parse.js";
import * as repository from "./repository.js";
import { markdownToPlainText } from "./render.js";
import { extractJobTitle, scoreResume, type ScoreBreakdown } from "./scorer.js";

/** Ceiling for the skill-extraction call. */
const SKILLS_BUDGET_MS = 30000;
/** Room a refinement pass needs; a typical pass takes 15 to 45 seconds. */
const REFINE_PASS_MS = 45000;

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
  const inferredJobTitle = extractJobTitle(params.jobDescription);

  // One curated skill list per request: the generator is told to cover it and
  // the scorer grades against it. If extraction fails we fall back to the
  // frequency heuristics rather than failing the request.
  // ponytail: one synchronous request under a wall-clock budget. Move to a
  // background job with polling if optimisations need longer than the proxy allows.
  const deadlineAt = Date.now() + config.RESUME_TOTAL_BUDGET_MS;

  let skills: JdSkills | undefined;
  try {
    // Capped so a slow extraction cannot eat the generation budget.
    const extracted = await optimizer.extractSkills?.(
      params.jobDescription,
      Math.min(deadlineAt, Date.now() + SKILLS_BUDGET_MS),
    );
    if (extracted?.hard.length) skills = extracted;
  } catch (error) {
    console.error("[optimizer] skill extraction failed, using heuristics:", String(error).slice(0, 200));
  }
  const score = (markdown: string) =>
    scoreResume(markdownToPlainText(markdown), params.jobDescription, {
      jobTitle: params.jobTitle,
      companyName: params.companyName,
      skills,
    });

  let best: { markdown: string; score: number; breakdown: ScoreBreakdown } | null = null;
  let missingKeywords: string[] | undefined;
  let gaps: string[] | undefined;

  for (let pass = 0; pass < config.RESUME_MAX_REFINE_PASSES; pass++) {
    // Refine only while there is room for a whole pass.
    if (best && deadlineAt - Date.now() < REFINE_PASS_MS) break;
    let markdown: string;
    try {
      markdown = await optimizer.optimize({
        resumeText,
        jobDescription: params.jobDescription,
        companyName: params.companyName,
        jobTitle: params.jobTitle,
        inferredJobTitle,
        enhancements: params.enhancements,
        requiredSkills: skills,
        missingKeywords,
        gaps,
        deadlineAt,
      });
    } catch (error) {
      // A failed refinement must not throw away a draft we already have.
      if (best) break;
      throw error;
    }
    // Score the text an ATS would extract from the rendered file, not the
    // markdown source (whose ** markers become real bold when rendered).
    const scored = score(markdown);
    if (!best || scored.score > best.score) {
      best = { markdown, score: scored.score, breakdown: scored.breakdown };
    }
    if (scored.score >= config.RESUME_SCORE_TARGET) break;
    // Feed the specific, scored shortfalls back into the next pass.
    missingKeywords = scored.missingKeywords;
    gaps = scored.gaps;
  }

  if (!best) throw new AppError(502, "OPTIMIZER_FAILED", "Resume optimization produced no result");

  // Whatever the model still left out of the curated list is added to the
  // Skills section in code, so coverage does not depend on model compliance.
  // Only done for a curated list: the heuristic list can contain prose.
  if (skills) {
    const patched = appendMissingSkills(
      best.markdown,
      best.breakdown.keywords.missing,
      best.breakdown.softSkills.missing,
    );
    if (patched !== best.markdown) {
      const rescored = score(patched);
      if (rescored.score >= best.score) {
        best = { markdown: patched, score: rescored.score, breakdown: rescored.breakdown };
      }
    }
  }

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
