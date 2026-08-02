export interface ScoreComponent { earned: number; possible: number }
export interface ScoreBreakdown {
  keywords: ScoreComponent & { missing: string[] };
  structure: ScoreComponent;
  parseability: ScoreComponent;
  contact: ScoreComponent;
  length: ScoreComponent;
}
export interface ResumeScore { score: number; breakdown: ScoreBreakdown; missingKeywords: string[] }

const STOPWORDS = new Set([
  "the","a","an","and","or","to","of","in","on","for","with","is","are","be","as",
  "we","you","our","your","must","need","should","will","have","has","this","that",
  "at","by","from","into","who","can","must","also","who","their","they","it","its",
  "experience","years","team","teams","work","working","role","job","strong","good","plus",
  "know","knows","knowledge","using","used","use","ability","able","including","etc",
  // Generic JD prose / culture filler a real resume rarely echoes verbatim
  "about","want","wants","part","dynamic","environment","within","forefront","enabling",
  "enable","outside","looking","passionate","high","quality","description","join","joining",
  "seeking","seek","ideal","candidate","candidates","responsibilities","responsibility",
  "requirements","requirement","required","require","preferred","prefer","nice","great",
  "excellent","opportunity","company","companies","well","more","most","across","over",
  "help","some","any","all","new","other","senior","junior","mid","lead","principal",
  "engineer","developer","hire","hiring","position","opening","people","person","world",
  "class","best","top","leading","cutting","edge","proven","track","record","fast","paced",
  "highly","closely","directly","strongly","currently","previously","ideally","who","what",
  "where","when","why","how","you'll","we're","join","build","building","develop","developing",
  "design","designing","ensure","drive","deliver","delivering","manage","managing","support",
  "supporting","collaborate","collaborating","mentor","mentoring","own","create","creating",
  "maintain","improve","grow","ship","shipping","looking","day","daily","every","both",
]);

export function extractKeywords(jobDescription: string): string[] {
  const tokens = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9+#/.\- ]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens));
}

const SECTION_HEADINGS = ["experience", "education", "skills"];

export function scoreResume(resumeText: string, jobDescription: string): ResumeScore {
  const text = resumeText.toLowerCase();
  const keywords = extractKeywords(jobDescription);

  // Keywords (40): share of JD keywords present, capped to top 30 salient terms.
  const salient = keywords.slice(0, 30);
  const present = salient.filter((k) => text.includes(k));
  const missing = salient.filter((k) => !text.includes(k));
  const keywordEarned = salient.length === 0 ? 40 : Math.round((present.length / salient.length) * 40);

  // Structure (20): standard headings present (contact implied elsewhere).
  const headingsHit = SECTION_HEADINGS.filter((h) => text.includes(h)).length;
  const structureEarned = Math.round((headingsHit / SECTION_HEADINGS.length) * 20);

  // Parseability (20): no obvious non-ATS artifacts (tables/images/tab columns).
  const badArtifacts = /\t{2,}|\|\s*\||<img|•\s*•/.test(resumeText);
  const parseEarned = badArtifacts ? 8 : 20;

  // Contact (10): email or phone present.
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resumeText);
  const contactEarned = hasEmail || hasPhone ? 10 : 0;

  // Length (10): sane word count band 150-900.
  const words = resumeText.trim().split(/\s+/).filter(Boolean).length;
  const lengthEarned = words >= 150 && words <= 900 ? 10 : words >= 80 ? 6 : 3;

  const breakdown: ScoreBreakdown = {
    keywords: { earned: keywordEarned, possible: 40, missing },
    structure: { earned: structureEarned, possible: 20 },
    parseability: { earned: parseEarned, possible: 20 },
    contact: { earned: contactEarned, possible: 10 },
    length: { earned: lengthEarned, possible: 10 },
  };
  const score =
    keywordEarned + structureEarned + parseEarned + contactEarned + lengthEarned;

  return { score, breakdown, missingKeywords: missing };
}
