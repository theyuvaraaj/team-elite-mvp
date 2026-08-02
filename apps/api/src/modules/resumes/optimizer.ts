import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";

export type OptimizeMode = "rewrite" | "content";

export interface OptimizeInput {
  resumeText: string;
  jobDescription: string;
  companyName: string;
  mode?: OptimizeMode;
  missingKeywords?: string[];
}
export interface ResumeOptimizer { optimize(input: OptimizeInput): Promise<string> }

const FORMAT_RULES = [
  "Formatting (strict — the output is rendered to PDF/DOCX by a simple parser):",
  "- Output GitHub-flavored Markdown, single column. NO tables, NO images, NO multi-column layout, NO horizontal rules, NO code blocks or backticks.",
  "- Line 1 is the candidate name; line 2 is a contact line (email/phone) from the base resume.",
  "- Section titles use '## ' headings. Bullets use '- '. Use **bold** only for a company/role or a skill-group label, never for random words mid-sentence.",
];

export function buildPrompt(input: OptimizeInput): string {
  const missing = input.missingKeywords?.length
    ? `\nThe previous draft was still missing these job-description keywords — weave the truthful ones in naturally: ${input.missingKeywords.join(", ")}.`
    : "";
  const strategy =
    input.mode === "content"
      ? [
          "You are an expert resume editor. TAILOR the BASE RESUME to the JOB DESCRIPTION at " + input.companyName + " while PRESERVING the candidate's existing resume structure.",
          "Rules:",
          "- Keep the SAME sections, in the SAME order, with the SAME headings the base resume already uses. Do not add, remove, merge, or reorder sections.",
          "- Only rewrite the wording of existing bullets and the summary to emphasize the skills and terminology the job description asks for.",
          "- You may sharpen bullets and fold in job-relevant skills the candidate plausibly has, but keep the overall shape, length, and layout close to the original.",
          "- Do not invent employers, job titles, employment dates, degrees, or certifications that contradict the base resume.",
        ]
      : [
          "You are an elite resume writer. Rewrite the BASE RESUME into a compelling, ATS-optimized resume that positions the candidate as a strong, obvious match for the JOB DESCRIPTION at " + input.companyName + ". Be confident and aggressive in tailoring to maximize interview callbacks.",
          "Rules:",
          "- Use standard sections: Summary, Skills, Experience, Education (add Projects/Certifications only if the base resume has them).",
          "- Skills: present the technologies, tools, and competencies the job description asks for as the candidate's own; you MAY add job-relevant skills the base resume does not explicitly mention.",
          "- Experience: KEEP the candidate's real employers, titles, and dates, but rewrite every bullet into specific, confident, metric-driven achievements demonstrating the job's required skills.",
          "- Summary: 2-3 sentences framing the candidate as an ideal fit for this exact role.",
          "- Write natural, professional prose — never a comma-separated keyword dump as a sentence.",
          "- Do not invent employers, job titles, employment dates, degrees, or certifications that contradict the base resume; everything else — skills, tools, framing and depth of experience — may be enriched.",
        ];
  return [
    ...strategy,
    ...FORMAT_RULES,
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
