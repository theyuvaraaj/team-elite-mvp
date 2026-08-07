export interface ScoreComponent { earned: number; possible: number }
export interface ScoreBreakdown {
  keywords: ScoreComponent & { missing: string[] };
  jobTitle: ScoreComponent & { expected: string | null };
  contact: ScoreComponent & { missing: string[] };
  measurable: ScoreComponent;
  softSkills: ScoreComponent & { missing: string[] };
  structure: ScoreComponent & { missing: string[] };
  dates: ScoreComponent;
  length: ScoreComponent & { words: number };
  parseability: ScoreComponent & { issues: string[] };
}
export interface ResumeScore {
  score: number;
  breakdown: ScoreBreakdown;
  missingKeywords: string[];
  /** Actionable, human-readable gaps the refine pass should close. */
  gaps: string[];
}

const STOPWORDS = new Set([
  "the","a","an","and","or","to","of","in","on","for","with","is","are","be","as",
  "we","you","our","your","must","need","should","will","have","has","this","that",
  "at","by","from","into","who","can","also","their","they","it","its","but","not",
  "experience","years","year","team","teams","work","working","role","job","jobs",
  "strong","good","plus","know","knows","knowledge","using","used","use","ability",
  "able","including","etc","about","want","wants","part","dynamic","environment",
  "within","forefront","enabling","enable","outside","looking","passionate","high",
  "quality","description","join","joining","seeking","seek","ideal","candidate",
  "candidates","responsibilities","responsibility","requirements","requirement",
  "required","require","preferred","prefer","nice","great","excellent","opportunity",
  "company","companies","well","more","most","across","over","help","some","any",
  "all","new","other","hire","hiring","position","opening","people","person","world",
  "class","best","top","leading","cutting","edge","proven","track","record","fast",
  "paced","highly","closely","directly","strongly","currently","previously","ideally",
  "what","where","when","why","how","build","building","develop","developing",
  "design","designing","ensure","drive","deliver","delivering","manage","managing",
  "support","supporting","collaborate","collaborating","mentor","mentoring","own",
  "create","creating","maintain","improve","grow","ship","shipping","day","daily",
  "every","both","you'll","we're","we'll","us","per","via","etc.","such","many",
  "including","ensuring","while","would","could","may","might","get","make","take",
  "like","one","two","three","first","second","end","full","time","level","based",
  "essential","desirable","mandatory","key","various","several","etc","able",
  "willing","comfortable","familiar","familiarity","understanding","exposure",
  "bonus","advantage","asset","ideally","plus","min","max","least",
]);

/**
 * Legal / EEO / benefits boilerplate. Job descriptions end with pages of this,
 * and treating it as required keywords makes the optimizer stuff nonsense like
 * "privacy notice" or "gender" into the resume.
 */
const BOILERPLATE_MARKERS = [
  "equal opportunit", "equal employment", "eeo", "affirmative action",
  "privacy notice", "privacy policy", "data protection notice",
  "reasonable accommodation", "accommodation request", "disabilit",
  "protected veteran", "veteran status", "regardless of race", "race, colour",
  "race, color", "color, religion", "colour, religion", "religion, sex",
  "gender identity", "gender, ", "sexual orientation", "national origin",
  "marital status",
  "background check", "e-verify", "recruitment agency", "agency partner",
  "sustainability", "volunteering", "charitable", "we are proud to be",
  "diversity, equity", "dei ", "benefits package", "compensation range",
  "salary range", "healthcare benefits", "annual wellness", "paid time off",
];

/** Residual boilerplate words that survive sentence filtering. */
const BOILERPLATE_WORDS = new Set([
  "purpose", "values", "culture", "inclusive", "inclusion", "diverse",
  "diversity", "belonging", "community", "communities", "society", "sustainable",
  "integrity", "partnership", "excellence", "innovation", "colleagues",
  "employer", "employment", "applicant", "applicants", "applications",
  "qualifications", "consideration", "compliance", "law", "laws", "legal",
  "notice", "policy", "policies", "information", "opportunities", "opportunity",
  "gender", "volunteering", "sustainability", "wellbeing", "wellness",
  "benefits", "salary", "compensation", "perks", "holidays", "leave",
  "organisation", "organization", "worldwide", "colleague",
]);

/**
 * Soft skills — Jobscan scores these as their own category. Each entry lists
 * accepted surface forms; the first is the canonical label.
 */
const SOFT_SKILLS: string[][] = [
  ["communication", "communicate", "communicating"],
  ["collaboration", "collaborate", "collaborating", "cross-functional", "partner with"],
  ["leadership", "lead", "leading", "led"],
  ["mentoring", "mentor", "mentored", "coaching", "coach"],
  ["problem solving", "problem-solving", "troubleshooting", "root cause"],
  ["ownership", "owned", "accountable", "accountability", "end-to-end ownership"],
  ["continuous improvement", "continuous learning", "learning mindset"],
  ["stakeholder management", "stakeholders", "stakeholder"],
  ["adaptability", "adaptable", "flexible", "agile mindset"],
  ["teamwork", "team player", "cross-team"],
  ["attention to detail", "detail-oriented", "meticulous"],
  ["time management", "prioritization", "prioritise", "prioritize"],
];

/** Drop legal/EEO/benefits prose so it never becomes a "required" keyword. */
export function stripBoilerplate(jobDescription: string): string {
  return jobDescription
    .split(/\n+|(?<=[.!?])\s+/)
    .filter((chunk) => {
      const lower = chunk.toLowerCase();
      return !BOILERPLATE_MARKERS.some((marker) => lower.includes(marker));
    })
    .join("\n");
}

/** Words that indicate a role/title noun, used to find the JD's job title. */
const TITLE_NOUNS = [
  "engineer","developer","manager","analyst","designer","scientist","architect",
  "consultant","specialist","administrator","director","lead","programmer",
  "researcher","recruiter","accountant","marketer","strategist","technician",
];
const TITLE_MODIFIERS = [
  "senior","staff","principal","junior","lead","chief","head","associate","assistant",
  "backend","frontend","fullstack","full-stack","software","data","product","project",
  "platform","cloud","security","payments","payment","devops","site","reliability",
  "machine","learning","ml","ai","qa","test","mobile","ios","android","web","systems",
  "solutions","business","financial","marketing","sales","operations","technical",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[‐-―]/g, "-").replace(/\s+/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9+#/.\- ]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter(Boolean);
}

function isContentWord(token: string): boolean {
  return (
    token.length >= 3 &&
    !STOPWORDS.has(token) &&
    !BOILERPLATE_WORDS.has(token) &&
    !/^\d+$/.test(token)
  );
}

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-term match — NOT a substring match. "api" must not match "rapid",
 * "react" must not match "reactive". Allows a trailing plural "s".
 */
export function containsTerm(haystack: string, term: string): boolean {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegex(term)}s?(?![a-z0-9])`, "i");
  return pattern.test(haystack);
}

/**
 * Salient JD terms, including multi-word phrases ("payment systems", "ci/cd
 * pipelines"), ranked by how often the JD repeats them. Phrases matter because
 * real ATS scanners match them as units.
 */
export function extractKeywords(jobDescription: string): string[] {
  const normalized = normalize(stripBoilerplate(jobDescription));
  const counts = new Map<string, number>();
  const bump = (term: string, by = 1) =>
    counts.set(term, (counts.get(term) ?? 0) + by);

  // Segment so phrases never span punctuation/clause boundaries.
  for (const segment of normalized.split(/[.,;:!?()\[\]\n•·|]+/)) {
    const tokens = tokenize(segment);
    tokens.forEach((token, index) => {
      if (isContentWord(token)) bump(token);
      const next = tokens[index + 1];
      // A bigram counts only when both halves are meaningful.
      if (next && isContentWord(token) && isContentWord(next)) {
        bump(`${token} ${next}`, 2); // phrases are stronger signal than words
      }
    });
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([term]) => term);
}

/**
 * Best-guess job title from the JD. Handles the qualifier forms real postings
 * use — "Senior Engineer, Site Reliability" and "Senior Engineer in Site
 * Reliability" — because ATS scanners want the title matched as a whole.
 */
export function extractJobTitle(jobDescription: string): string | null {
  const cleaned = stripBoilerplate(jobDescription);
  // Prefer a title that appears with its qualifier, e.g. "Engineer, Site Reliability".
  const qualified = normalize(cleaned).match(
    new RegExp(
      `((?:[a-z-]+\\s+){0,3}(?:${TITLE_NOUNS.join("|")}))\\s*(?:,|\\bin\\b|\\bof\\b|-)\\s*((?:[a-z-]+\\s*){1,3})`,
      "i",
    ),
  );
  if (qualified) {
    const head = qualified[1]!.trim().split(/\s+/).filter((w) => TITLE_MODIFIERS.includes(w) || TITLE_NOUNS.includes(w));
    const tail = qualified[2]!.trim().split(/\s+/).filter((w) => TITLE_MODIFIERS.includes(w) || TITLE_NOUNS.includes(w));
    if (head.length && tail.length) return [...head, ...tail].join(" ");
  }

  const tokens = tokenize(cleaned);
  for (let i = 0; i < tokens.length; i++) {
    if (!TITLE_NOUNS.includes(tokens[i]!)) continue;
    const parts = [tokens[i]!];
    for (let j = i - 1; j >= 0 && i - j <= 3; j--) {
      const prev = tokens[j]!;
      if (TITLE_MODIFIERS.includes(prev) || TITLE_NOUNS.includes(prev)) {
        parts.unshift(prev);
      } else break;
    }
    return parts.join(" ");
  }
  return null;
}

const SECTIONS: { name: string; patterns: RegExp[] }[] = [
  { name: "summary", patterns: [/\b(summary|profile|objective|about me)\b/i] },
  { name: "skills", patterns: [/\b(skills|technical skills|competencies|technologies)\b/i] },
  { name: "experience", patterns: [/\b(experience|employment|work history|professional)\b/i] },
  { name: "education", patterns: [/\b(education|academic)\b/i] },
];

const DATE_RANGE =
  /\b((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(19|20)\d{2}\s*(-|–|—|to)\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?((19|20)\d{2}|present|current)\b/i;

function bulletLines(resumeText: string): string[] {
  return resumeText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^([-*•]|\d+\.)\s+/.test(l));
}

export interface ScoreOptions {
  /** Exact posting title, when the user supplied one. */
  jobTitle?: string | null;
}

/** Contiguous title match, tolerating "," / "in" / "of" between the parts. */
function containsTitlePhrase(haystack: string, title: string): boolean {
  const words = title.split(/\s+/).filter(Boolean).map(escapeRegex);
  if (!words.length) return false;
  const joiner = "[\\s,\\-–]*(?:in|of|for)?[\\s,\\-–]*";
  return new RegExp(`(?<![a-z0-9])${words.join(joiner)}`, "i").test(haystack);
}

export function scoreResume(
  resumeText: string,
  jobDescription: string,
  options: ScoreOptions = {},
): ResumeScore {
  const text = normalize(resumeText);
  const gaps: string[] = [];

  // --- Hard skills / keyword match (40) --------------------------------------
  // Whole-term matching over the JD's most repeated words AND phrases.
  const ranked = extractKeywords(jobDescription);
  const phrases = ranked.filter((t) => t.includes(" ")).slice(0, 12);
  const words = ranked.filter((t) => !t.includes(" ")).slice(0, 24);
  // Drop words already covered by a matched phrase to avoid double-counting.
  const salient = [...phrases, ...words];
  const present = salient.filter((t) => containsTerm(text, t));
  const missing = salient.filter((t) => !containsTerm(text, t));
  const keywordEarned =
    salient.length === 0 ? 35 : Math.round((present.length / salient.length) * 35);
  if (missing.length) gaps.push(`Missing job-description terms: ${missing.slice(0, 12).join(", ")}`);

  // --- Job title match (10) --------------------------------------------------
  // Real ATS scanners weight the target title heavily.
  const inferredTitle = extractJobTitle(jobDescription);
  const suppliedTitle = options.jobTitle?.trim() || null;
  // Grade against both; a scanner uses the posting's own title, so the weaker
  // of the two is the honest number.
  const titleCandidates = [suppliedTitle, inferredTitle].filter(Boolean) as string[];
  const expectedTitle = suppliedTitle ?? inferredTitle;
  let titleEarned = 10;
  if (titleCandidates.length) {
    // Full marks need the title as one contiguous phrase — scanners look for
    // the whole title, not its words scattered around.
    const scoreTitle = (candidate: string): number => {
      const normalizedTitle = normalize(candidate);
      if (containsTitlePhrase(text, normalizedTitle)) return 10;
      const words = normalizedTitle.split(/\s+/).filter((w) => w.length > 2);
      const hit = words.filter((w) => containsTerm(text, w));
      return words.length ? Math.min(6, Math.round((hit.length / words.length) * 6)) : 10;
    };
    const weakest = titleCandidates
      .map((title) => ({ title, points: scoreTitle(title) }))
      .reduce((a, b) => (b.points < a.points ? b : a));
    titleEarned = weakest.points;
    if (titleEarned < 10) {
      gaps.push(
        `Use the exact job title "${weakest.title}" as one contiguous phrase in the summary's first sentence AND as the most recent role's title`,
      );
    }
  }

  // --- Contact completeness (10) --------------------------------------------
  // email + phone + location + LinkedIn — checkers flag each missing piece.
  const missingContact: string[] = [];
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resumeText);
  // Location lives in the contact block, so only inspect the header. Requiring
  // "City, ST" / "City, Country" there avoids matching prose like
  // "BS Computer Science, University of Texas".
  const header = resumeText.split("\n").slice(0, 4).join("\n");
  // A real "City, Region" — scanners explicitly reject "Remote" as an address.
  const hasLocation = /\b[A-Z][a-zA-Z.\-]+,\s*([A-Z]{2}\b|[A-Z][a-zA-Z]+)/.test(header);
  const hasLinkedIn = /linkedin\.com\/in\/|linkedin:/i.test(resumeText);
  if (!hasEmail) missingContact.push("email");
  if (!hasPhone) missingContact.push("phone");
  if (!hasLocation) missingContact.push(/\bremote\b/i.test(header) ? "a real city (\"Remote\" is not an address)" : "location");
  if (!hasLinkedIn) missingContact.push("LinkedIn");
  const contactEarned =
    (hasEmail ? 3 : 0) + (hasPhone ? 3 : 0) + (hasLocation ? 2 : 0) + (hasLinkedIn ? 2 : 0);
  if (missingContact.length) gaps.push(`Add to the contact line: ${missingContact.join(", ")}`);

  // --- Measurable results (10) ----------------------------------------------
  const bullets = bulletLines(resumeText);
  // A metric is a number tied to a unit, currency, or percentage — a bare
  // year like "2021" is not an achievement.
  const quantified = bullets.filter((b) =>
    /\d+\s*%|\$\s?[\d,]|\b\d[\d,.]*\s*(x\b|k\b|m\b|bn\b|million|billion|hours?|days?|weeks?|months?|users?|customers?|clients?|requests?|engineers?|people|teams?|reports?|ms\b|seconds?|minutes?|qps\b|rps\b|tickets?|accounts?|markets?|products?|releases?|deploys?)/i.test(
      b,
    ),
  );
  const quantRatio = bullets.length === 0 ? 0 : quantified.length / bullets.length;
  const measurableEarned = Math.round(Math.min(1, quantRatio / 0.6) * 10);
  if (measurableEarned < 10) {
    gaps.push("Add concrete metrics (%, $, counts, time saved) to more experience bullets");
  }

  // --- Soft skills (10) -----------------------------------------------------
  // Only the soft skills the JD actually asks for are graded.
  const jdText = normalize(stripBoilerplate(jobDescription));
  const wantedSoft = SOFT_SKILLS.filter((forms) => forms.some((f) => jdText.includes(f)));
  const softPresent = wantedSoft.filter((forms) => forms.some((f) => text.includes(f)));
  const missingSoft = wantedSoft
    .filter((forms) => !forms.some((f) => text.includes(f)))
    .map((forms) => forms[0]!);
  const softEarned = wantedSoft.length === 0 ? 10 : Math.round((softPresent.length / wantedSoft.length) * 10);
  if (missingSoft.length) {
    gaps.push(`Demonstrate these soft skills the job asks for: ${missingSoft.join(", ")}`);
  }

  // --- Section structure (8) ----------------------------------------------
  const missingSections = SECTIONS.filter((s) => !s.patterns.some((p) => p.test(resumeText))).map(
    (s) => s.name,
  );
  const structureEarned = Math.round(((SECTIONS.length - missingSections.length) / SECTIONS.length) * 8);
  if (missingSections.length) gaps.push(`Add standard sections: ${missingSections.join(", ")}`);

  // --- Date formatting (5) --------------------------------------------------
  const dateMatches = resumeText.match(new RegExp(DATE_RANGE, "gi")) ?? [];
  const datesEarned = dateMatches.length >= 2 ? 5 : dateMatches.length === 1 ? 3 : 0;
  if (datesEarned < 5) {
    gaps.push("Give every role an explicit date range (e.g. Jan 2021 - Present)");
  }

  // --- Length (5) -----------------------------------------------------------
  const wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;
  // 400-1000 covers a focused one-pager through a full senior two-pager.
  const lengthEarned =
    wordCount >= 400 && wordCount <= 1000 ? 4 : wordCount >= 250 && wordCount <= 1200 ? 2 : 1;
  if (lengthEarned < 4) gaps.push(`Target 400-1000 words (currently ${wordCount})`);

  // --- Parseability (10) ---------------------------------------------------
  const issues: string[] = [];
  if (/\t{2,}|\|\s*\||<img|<table/i.test(resumeText)) issues.push("table/column layout");
  if (/[•]\s*[•]|[-]/.test(resumeText)) issues.push("non-standard glyphs");
  if (/\*\*|__|`/.test(resumeText)) issues.push("unrendered markdown markers");
  const parseEarned = Math.max(0, 8 - issues.length * 4);
  if (issues.length) gaps.push(`Fix parseability: ${issues.join(", ")}`);

  const breakdown: ScoreBreakdown = {
    keywords: { earned: keywordEarned, possible: 35, missing },
    jobTitle: { earned: titleEarned, possible: 10, expected: expectedTitle },
    contact: { earned: contactEarned, possible: 10, missing: missingContact },
    measurable: { earned: measurableEarned, possible: 10 },
    softSkills: { earned: softEarned, possible: 10, missing: missingSoft },
    structure: { earned: structureEarned, possible: 8, missing: missingSections },
    dates: { earned: datesEarned, possible: 5 },
    length: { earned: lengthEarned, possible: 4, words: wordCount },
    parseability: { earned: parseEarned, possible: 8, issues },
  };

  const score =
    keywordEarned +
    titleEarned +
    contactEarned +
    measurableEarned +
    softEarned +
    structureEarned +
    datesEarned +
    lengthEarned +
    parseEarned;

  return { score, breakdown, missingKeywords: missing, gaps };
}
