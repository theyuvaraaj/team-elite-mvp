import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";

/** Opt-in enhancements. All default OFF — the caller must ask for them. */
export interface OptimizeEnhancements {
  /** Rewrite job titles to mirror the JD's target title. */
  alignJobTitles?: boolean;
  /** Add a Certifications section with JD-relevant certifications. */
  addCertifications?: boolean;
  /** Put a location in the contact line. */
  addLocation?: boolean;
  /** Explicit location; when omitted with addLocation, infer it from the JD. */
  location?: string | null;
}

export interface OptimizeInput {
  resumeText: string;
  jobDescription: string;
  companyName: string;
  jobTitle?: string | null;
  /** Title inferred from the JD, used when the caller supplied none. */
  inferredJobTitle?: string | null;
  enhancements?: OptimizeEnhancements;
  missingKeywords?: string[];
  /** Specific, scored gaps from the previous pass. */
  gaps?: string[];
}
export interface ResumeOptimizer { optimize(input: OptimizeInput): Promise<string> }

const FORMAT_RULES = [
  "Formatting (strict — the output is rendered to PDF/DOCX by a simple parser):",
  "- Output GitHub-flavored Markdown, single column. NO tables, NO images, NO multi-column layout, NO horizontal rules, NO code blocks or backticks.",
  "- Line 1 is the candidate name; line 2 is a single contact line; line 3 is the target job title headline.",
  "- Section titles use '## ' headings. Bullets use '- '. Use **bold** only for a company/role or a skill-group label, never for random words mid-sentence.",
];

/**
 * Requirements that mirror how real ATS scanners (Jobscan and similar) score a
 * resume. Every item here maps to a component in scorer.ts.
 */
const ATS_RULES = [
  "ATS scoring requirements (these are graded — satisfy every one):",
  "- HEADLINE (highest-value line on the resume): line 3, immediately after the contact line and before the Summary heading, is the target job title on its own — written EXACTLY as given, in Title Case, nothing else on that line. This is where recruiters' title searches look.",
  "- TARGET TITLE: also use that exact title, as one contiguous phrase, in the Summary's first sentence. Never reword it — do not swap ',' for 'in', do not reorder the words, do not substitute synonyms (scanners like Taleo match near-exactly, so 'program management' does not match 'project management').",
  "- KEYWORDS: reuse the job description's exact wording for skills, including multi-word phrases (e.g. 'payment systems', 'CI/CD pipelines', 'distributed systems'). Match the JD's spelling and casing conventions rather than synonyms.",
  "- CONTACT LINE: one line containing email, phone, city + state/country, and a LinkedIn URL (linkedin.com/in/...), separated by ' | '. Reuse whatever the base resume provides; keep any placeholder the base resume already had.",
  "- METRICS: at least 70% of experience bullets must contain a concrete number tied to a unit — a percentage, currency amount, count of users/requests/engineers, or a time saved. Never write a bare year as the only number.",
  "- SECTIONS: include Summary, Skills, Experience, and Education headings.",
  "- DATES: every role needs an explicit range like 'Jan 2021 - Present' or '2018 - 2020'.",
  "- LENGTH: 600-950 words total. Expand thin experience with substantive, believable achievement bullets rather than padding with adjectives.",
  "- Plain ASCII only: no emoji, no icon glyphs, no decorative separators.",
  "- SOFT SKILLS: evidence the soft skills the job description names (collaboration, mentoring, ownership, communication, continuous improvement, stakeholder management) inside achievement bullets — never as a bare list.",
  "- NO FIRST PERSON: never use 'I', 'me', or 'my'. Write in the implied-subject resume voice ('Led...', 'Built...', 'Owned...').",
  "- Ignore the job description's legal, EEO, benefits, privacy, and company-values boilerplate. Never echo phrases like 'privacy notice', 'equal opportunity', or 'sustainability' into the resume.",
];

function enhancementRules(input: OptimizeInput): string[] {
  const e = input.enhancements;
  if (!e) return [];
  const rules: string[] = [];
  if (e.alignJobTitles) {
    rules.push(
      "- JOB TITLE ALIGNMENT (explicitly enabled): rewrite the candidate's job titles to match the job description's terminology (e.g. 'Software Engineer' -> 'Payments Engineer'). Keep seniority proportional to the real dates and never change employers or dates.",
    );
  }
  if (e.addCertifications) {
    rules.push(
      "- CERTIFICATIONS (explicitly enabled): add a '## Certifications' section (or extend an existing one) listing 2-4 certifications that the job description asks for or that are standard for this role. Use real, correctly-named credentials with plausible issuers.",
    );
  }
  if (e.addLocation) {
    rules.push(
      e.location
        ? `- LOCATION (explicitly enabled): use exactly "${e.location}" as the candidate's location in the contact line.`
        : "- LOCATION (explicitly enabled): use a real 'City, Region' location — prefer the one already in the base resume, otherwise the role's location from the job description. NEVER write 'Remote' as the location; scanners reject it as an address.",
    );
  }
  return rules.length ? ["Requested enhancements:", ...rules] : [];
}

export function buildPrompt(input: OptimizeInput): string {
  // Always hand the model a concrete title; the ATS rules reference it.
  const targetTitle = input.jobTitle?.trim() || input.inferredJobTitle?.trim();
  const feedback: string[] = [];
  if (input.gaps?.length) {
    feedback.push(
      "",
      "The previous draft scored below target. Fix each of these specifically:",
      ...input.gaps.map((g) => `- ${g}`),
    );
  } else if (input.missingKeywords?.length) {
    feedback.push(
      `\nThe previous draft was still missing these job-description terms — weave them in naturally: ${input.missingKeywords.join(", ")}.`,
    );
  }
  const missing = feedback.join("\n");
  const strategy = [
    "You are an elite resume writer. Rewrite the BASE RESUME into a compelling, ATS-optimized resume that positions the candidate as a strong, obvious match for the JOB DESCRIPTION at " + input.companyName + ". Be confident and aggressive in tailoring to maximize interview callbacks.",
    "Rules:",
    "- Use standard sections: Summary, Skills, Experience, Education. Add Projects only if the base resume has them; add Certifications only if the base resume has them or an enhancement below requests it.",
    "- Skills: present the technologies, tools, and competencies the job description asks for as the candidate's own; you MAY add job-relevant skills the base resume does not explicitly mention.",
    "- Experience: KEEP the candidate's real employers, titles, and dates, but rewrite every bullet into specific, confident, metric-driven achievements demonstrating the job's required skills.",
    "- Summary: 2-3 sentences framing the candidate as an ideal fit for this exact role.",
    "- Write natural, professional prose — never a comma-separated keyword dump as a sentence.",
    "- Do not invent employers, employment dates, or degrees that contradict the base resume; everything else — skills, tools, framing and depth of experience — may be enriched.",
  ];
  return [
    ...strategy,
    ...(targetTitle ? [`TARGET JOB TITLE (use verbatim): ${targetTitle}`] : []),
    ...ATS_RULES,
    ...enhancementRules(input),
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

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function isRetryable(error: unknown): boolean {
  // generate() wraps upstream failures in AppError, so check that first.
  if (error instanceof AppError) return RETRYABLE_STATUS.has(error.statusCode);
  const status = (error as { status?: number })?.status;
  if (status && RETRYABLE_STATUS.has(status)) return true;
  const message = String((error as { message?: string })?.message ?? "");
  return /50\d|unavailable|high demand|overloaded|rate limit|try again/i.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiOptimizer implements ResumeOptimizer {
  async optimize(input: OptimizeInput): Promise<string> {
    const attempts = config.RESUME_MAX_RETRIES + 1;
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      // Last attempt tries the fallback model — the primary is often the one
      // under load.
      const model =
        attempt === attempts && config.RESUME_FALLBACK_MODEL
          ? config.RESUME_FALLBACK_MODEL
          : config.RESUME_OPTIMIZE_MODEL;
      try {
        return await this.generate(input, model);
      } catch (error) {
        lastError = error;
        // Gemini's free tier throws transient 503 "high demand" often enough
        // that a single failure should not surface to the user.
        const retryable = !(error instanceof AppError && error.code === "OPTIMIZER_UNCONFIGURED")
          && isRetryable(error);
        if (!retryable || attempt === attempts) break;
        await sleep(attempt * 1500);
      }
    }
    throw lastError;
  }

  private async generate(input: OptimizeInput, modelName: string): Promise<string> {
    if (!config.GEMINI_API_KEY) {
      throw new AppError(503, "OPTIMIZER_UNCONFIGURED", "Resume optimization is not configured (missing GEMINI_API_KEY)");
    }
    const timeoutMs = config.RESUME_REQUEST_TIMEOUT_MS;
    const client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    // SDK-level timeout aborts the underlying request.
    const model = client.getGenerativeModel(
      { model: modelName },
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
      // Log before mapping: a 429/timeout used to return early and left quota
      // and capacity failures invisible in the logs.
      console.error("[optimizer] Gemini call failed:", modelName, name, status ?? "", message.slice(0, 300));
      if (status === 429) throw new AppError(429, "OPTIMIZER_BUSY", "AI service is busy, try again shortly");
      if (name === "AbortError" || /timeout|timed out|deadline|aborted/i.test(message)) {
        throw new AppError(504, "OPTIMIZER_TIMEOUT", "The AI service timed out. Please try again.");
      }
      if (
        (status && status >= 500) ||
        /unavailable|high demand|overloaded|try again/i.test(message)
      ) {
        // Retryable upstream capacity problem, not a bad request.
        throw new AppError(503, "OPTIMIZER_BUSY", "AI service is busy, try again shortly");
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
    const loc = input.enhancements?.location || "Austin, TX";
    return [
      nameLine,
      `candidate@example.com | +1 555 0100 | ${loc} | linkedin.com/in/candidate`,
      "",
      "## Summary",
      `Results-driven professional targeting the role at ${input.companyName}, with hands-on strength across ${top}.`,
      "",
      "## Skills",
      kws.join(", "),
      "",
      "## Experience",
      "Acme Corp | Senior Engineer | Jan 2021 - Present",
      `- Delivered ${kws[0] ?? "core"} improvements that cut latency 45% across 40000 users.`,
      `- Led ${kws[1] ?? "platform"} work saving 12 hours per week and mentoring 5 engineers.`,
      "Globex | Engineer | Jun 2018 - Dec 2020",
      "- Shipped services handling 3000 requests per second with 99.9% uptime.",
      "",
      ...(input.enhancements?.addCertifications
        ? ["## Certifications", "- AWS Certified Solutions Architect - Associate", ""]
        : []),
      "## Education",
      "BS Computer Science, University, 2018",
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
