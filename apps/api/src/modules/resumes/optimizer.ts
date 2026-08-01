import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";

export interface OptimizeInput {
  resumeText: string;
  jobDescription: string;
  companyName: string;
  missingKeywords?: string[];
}
export interface ResumeOptimizer { optimize(input: OptimizeInput): Promise<string> }

export function buildPrompt(input: OptimizeInput): string {
  const missing = input.missingKeywords?.length
    ? `\nThe previous draft was missing these job-description keywords — weave the truthful ones in naturally: ${input.missingKeywords.join(", ")}.`
    : "";
  return [
    "You are an expert resume writer optimizing a resume for a specific job so it passes ATS screening.",
    "Rewrite the BASE RESUME to target the JOB DESCRIPTION at " + input.companyName + ".",
    "Rules:",
    "- Output GitHub-flavored Markdown only, single column, no tables, no images, no columns.",
    "- Use standard headings exactly: Summary, Skills, Experience, Education (add Projects/Certifications only if present in the base).",
    "- Start with the candidate name on line 1 and a contact line (email/phone) on line 2.",
    "- Mirror the job description's terminology and hard skills where the candidate genuinely has them.",
    "- Do NOT invent employers, degrees, dates, or skills the base resume does not support.",
    "- Prefer concise achievement bullets with metrics where the base provides them.",
    missing,
    "",
    "=== BASE RESUME ===",
    input.resumeText,
    "",
    "=== JOB DESCRIPTION ===",
    input.jobDescription,
  ].join("\n");
}

export class GeminiOptimizer implements ResumeOptimizer {
  async optimize(input: OptimizeInput): Promise<string> {
    if (!config.GEMINI_API_KEY) {
      throw new AppError(503, "OPTIMIZER_UNCONFIGURED", "Resume optimization is not configured (missing GEMINI_API_KEY)");
    }
    const client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = client.getGenerativeModel({ model: config.RESUME_OPTIMIZE_MODEL });
    try {
      const result = await model.generateContent(buildPrompt(input));
      const text = result.response.text().trim();
      if (!text) throw new AppError(502, "OPTIMIZER_EMPTY", "The optimizer returned no content");
      return text;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const status = (error as { status?: number })?.status;
      if (status === 429) throw new AppError(429, "OPTIMIZER_BUSY", "AI service is busy, try again shortly");
      throw new AppError(502, "OPTIMIZER_FAILED", "Resume optimization failed");
    }
  }
}

// Deterministic, offline optimizer for tests / unconfigured envs.
export class StubOptimizer implements ResumeOptimizer {
  async optimize(input: OptimizeInput): Promise<string> {
    const nameLine = input.resumeText.split("\n")[0] || "Candidate Name";
    const kw = (input.missingKeywords ?? ["typescript", "leadership"]).join(", ");
    return [
      nameLine,
      "candidate@example.com | +1 555 0100",
      "",
      "## Summary",
      `Experienced professional targeting the role at ${input.companyName}.`,
      "",
      "## Skills",
      kw,
      "",
      "## Experience",
      `- Delivered results relevant to ${input.companyName} using ${kw}.`,
      "",
      "## Education",
      "BS, University",
    ].join("\n");
  }
}

export function getOptimizer(): ResumeOptimizer {
  if (config.NODE_ENV === "test" || !config.GEMINI_API_KEY) return new StubOptimizer();
  return new GeminiOptimizer();
}
