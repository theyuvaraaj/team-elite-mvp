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
    "You are an elite resume writer. Rewrite the BASE RESUME into a compelling, ATS-optimized resume that positions the candidate as a strong, obvious match for the JOB DESCRIPTION at " + input.companyName + ". The goal is to maximize interview callbacks — be confident and aggressive in tailoring.",
    "Rules:",
    "- Output GitHub-flavored Markdown only, single column, no tables, no images, no columns.",
    "- Use standard headings exactly: Summary, Skills, Experience, Education (add Projects/Certifications only if the base resume has them).",
    "- Line 1 is the candidate name, line 2 is a contact line (email/phone) taken from the base resume.",
    "- Skills: present the concrete technologies, tools, frameworks, and competencies the JOB DESCRIPTION asks for as the candidate's own skills. You MAY add job-relevant skills the base resume does not explicitly mention.",
    "- Experience: KEEP the candidate's real employers, job titles, and dates from the base resume, but rewrite every bullet to demonstrate the job description's required skills through specific, confident, metric-driven achievements.",
    "- Write natural, professional prose. NEVER output a comma-separated list of keywords as a sentence — every bullet must read like a genuine accomplishment a hiring manager would believe.",
    "- Summary: 2-3 sentences framing the candidate as an ideal fit for this exact role.",
    "- The one hard limit: do not invent employers, job titles, employment dates, academic degrees, or certifications that contradict the base resume (those are independently verifiable). Everything else — skills, tools, the framing and depth of experience — should be enriched to fit the role.",
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
    const timeoutMs = config.RESUME_REQUEST_TIMEOUT_MS;
    const client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    // SDK-level timeout aborts the underlying request.
    const model = client.getGenerativeModel(
      { model: config.RESUME_OPTIMIZE_MODEL },
      { timeout: timeoutMs },
    );
    try {
      // Backstop: never let a stalled call hang the request forever, even if
      // the SDK timeout fails to fire.
      let guard: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_, reject) => {
        guard = setTimeout(
          () => reject(new AppError(504, "OPTIMIZER_TIMEOUT", "The AI service timed out. Please try again.")),
          timeoutMs + 2000,
        );
      });
      let result;
      try {
        result = await Promise.race([model.generateContent(buildPrompt(input)), deadline]);
      } finally {
        if (guard) clearTimeout(guard);
      }
      const text = result.response.text().trim();
      if (!text) throw new AppError(502, "OPTIMIZER_EMPTY", "The optimizer returned no content");
      return text;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const status = (error as { status?: number })?.status;
      const name = (error as { name?: string })?.name ?? "";
      const message = String((error as { message?: string })?.message ?? "");
      if (status === 429) throw new AppError(429, "OPTIMIZER_BUSY", "AI service is busy, try again shortly");
      if (name === "AbortError" || /timeout|timed out|deadline|aborted/i.test(message)) {
        throw new AppError(504, "OPTIMIZER_TIMEOUT", "The AI service timed out. Please try again.");
      }
      throw new AppError(502, "OPTIMIZER_FAILED", "Resume optimization failed");
    }
  }
}

// Deterministic, offline optimizer for tests / unconfigured envs.
export class StubOptimizer implements ResumeOptimizer {
  async optimize(input: OptimizeInput): Promise<string> {
    const nameLine = input.resumeText.split("\n")[0] || "Candidate Name";
    const kws = (input.missingKeywords ?? ["typescript", "leadership"]).slice(0, 8);
    const top = kws.slice(0, 3).join(", ") || "the role's core areas";
    return [
      nameLine,
      "candidate@example.com | +1 555 0100",
      "",
      "## Summary",
      `Results-driven professional targeting the role at ${input.companyName}, with hands-on strength across ${top}.`,
      "",
      "## Skills",
      kws.join(", "),
      "",
      "## Experience",
      `- Delivered measurable impact applying ${kws[0] ?? "core"} and ${kws[1] ?? "modern"} practices on work relevant to ${input.companyName}.`,
      `- Partnered across teams to ship reliable solutions aligned to ${input.companyName}'s goals.`,
      "",
      "## Education",
      "BS, University",
    ].join("\n");
  }
}

export function getOptimizer(): ResumeOptimizer {
  // Tests always run offline against the stub, regardless of any key in the
  // environment. Dev without a key also uses the stub. But a keyless
  // PRODUCTION deploy falls through to GeminiOptimizer, which throws
  // 503 OPTIMIZER_UNCONFIGURED rather than fabricating a resume.
  if (config.NODE_ENV === "test") return new StubOptimizer();
  if (config.NODE_ENV !== "production" && !config.GEMINI_API_KEY) return new StubOptimizer();
  return new GeminiOptimizer();
}
