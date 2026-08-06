export interface ScoreComponent { earned: number; possible: number }
export interface ScoreBreakdown {
  keywords: ScoreComponent & { missing: string[] };
  jobTitle: ScoreComponent & { expected: string | null };
  contact: ScoreComponent & { missing: string[] };
  measurable: ScoreComponent;
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
]);

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
  return token.length >= 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token);
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
  const normalized = normalize(jobDescription);
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

/** Best-guess job title from the JD, e.g. "senior payments engineer". */
export function extractJobTitle(jobDescription: string): string | null {
  const tokens = tokenize(jobDescription);
  for (let i = 0; i < tokens.length; i++) {
    if (!TITLE_NOUNS.includes(tokens[i]!)) continue;
    const parts = [tokens[i]!];
    // Walk backwards over modifiers to capture the full title.
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

export function scoreResume(resumeText: string, jobDescription: string): ResumeScore {
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
    salient.length === 0 ? 40 : Math.round((present.length / salient.length) * 40);
  if (missing.length) gaps.push(`Missing job-description terms: ${missing.slice(0, 12).join(", ")}`);

  // --- Job title match (10) --------------------------------------------------
  // Real ATS scanners weight the target title heavily.
  const expectedTitle = extractJobTitle(jobDescription);
  let titleEarned = 10;
  if (expectedTitle) {
    const titleWords = expectedTitle.split(" ");
    const core = titleWords[titleWords.length - 1]!;
    if (containsTerm(text, expectedTitle)) titleEarned = 10;
    else if (containsTerm(text, titleWords.slice(-2).join(" "))) titleEarned = 7;
    else if (containsTerm(text, core)) titleEarned = 4;
    else titleEarned = 0;
    if (titleEarned < 10) {
      gaps.push(`Use the target job title "${expectedTitle}" in the summary and/or most recent role`);
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
  const hasLocation =
    /\b[A-Z][a-zA-Z.\-]+,\s*([A-Z]{2}\b|[A-Z][a-zA-Z]+)/.test(header) ||
    /\b(remote|hybrid)\b/i.test(header);
  const hasLinkedIn = /linkedin\.com\/in\/|linkedin:/i.test(resumeText);
  if (!hasEmail) missingContact.push("email");
  if (!hasPhone) missingContact.push("phone");
  if (!hasLocation) missingContact.push("location");
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

  // --- Section structure (10) ----------------------------------------------
  const missingSections = SECTIONS.filter((s) => !s.patterns.some((p) => p.test(resumeText))).map(
    (s) => s.name,
  );
  const structureEarned = Math.round(((SECTIONS.length - missingSections.length) / SECTIONS.length) * 10);
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
    wordCount >= 400 && wordCount <= 1000 ? 5 : wordCount >= 250 && wordCount <= 1200 ? 3 : 1;
  if (lengthEarned < 5) gaps.push(`Target 400-1000 words (currently ${wordCount})`);

  // --- Parseability (10) ---------------------------------------------------
  const issues: string[] = [];
  if (/\t{2,}|\|\s*\||<img|<table/i.test(resumeText)) issues.push("table/column layout");
  if (/[•]\s*[•]|[-]/.test(resumeText)) issues.push("non-standard glyphs");
  if (/\*\*|__|`/.test(resumeText)) issues.push("unrendered markdown markers");
  const parseEarned = Math.max(0, 10 - issues.length * 4);
  if (issues.length) gaps.push(`Fix parseability: ${issues.join(", ")}`);

  const breakdown: ScoreBreakdown = {
    keywords: { earned: keywordEarned, possible: 40, missing },
    jobTitle: { earned: titleEarned, possible: 10, expected: expectedTitle },
    contact: { earned: contactEarned, possible: 10, missing: missingContact },
    measurable: { earned: measurableEarned, possible: 10 },
    structure: { earned: structureEarned, possible: 10, missing: missingSections },
    dates: { earned: datesEarned, possible: 5 },
    length: { earned: lengthEarned, possible: 5, words: wordCount },
    parseability: { earned: parseEarned, possible: 10, issues },
  };

  const score =
    keywordEarned +
    titleEarned +
    contactEarned +
    measurableEarned +
    structureEarned +
    datesEarned +
    lengthEarned +
    parseEarned;

  return { score, breakdown, missingKeywords: missing, gaps };
}
