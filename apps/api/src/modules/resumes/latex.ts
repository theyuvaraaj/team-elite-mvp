import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { config } from "../../config.js";
import { parseInline, parseResumeLines, type Line } from "./render.js";

const execFileAsync = promisify(execFile);

// Escape LaTeX special characters in plain text.
function esc(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

// Render one markdown line to LaTeX, turning **bold** into \textbf and
// escaping everything else.
function inlineToLatex(text: string): string {
  return parseInline(text)
    .map((s) => (s.bold ? `\\textbf{${esc(s.text)}}` : esc(s.text)))
    .join("");
}

const PREAMBLE = String.raw`\documentclass[11pt,letterpaper]{article}
\usepackage[margin=0.7in]{geometry}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{titlesec}
\usepackage{parskip}
\pagestyle{empty}
\setlist[itemize]{leftmargin=1.25em,itemsep=1.5pt,topsep=2pt,parsep=0pt}
\titleformat{\section}{\normalsize\bfseries\scshape}{}{0em}{}[\vspace{-2pt}\hrule\vspace{2pt}]
\titlespacing{\section}{0pt}{8pt}{3pt}
\setlength{\parindent}{0pt}
\raggedright`;

export function markdownToLatex(markdown: string): string {
  const lines = parseResumeLines(markdown);
  const name = lines.find((l) => l.kind === "name")?.text ?? "Resume";

  // Before any heading: the first plain-text line is the contact line and the
  // second is the target-title headline. Both belong in the centered header.
  let contact = "";
  let headline = "";
  const body: Line[] = [];
  let seenHeading = false;
  for (const l of lines) {
    if (l.kind === "name") continue;
    if (l.kind === "heading") seenHeading = true;
    if (!seenHeading && l.kind === "text") {
      if (!contact) {
        contact = l.text;
        continue;
      }
      if (!headline) {
        headline = l.text;
        continue;
      }
    }
    body.push(l);
  }

  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("\\end{itemize}");
      inList = false;
    }
  };
  for (const l of body) {
    if (l.kind === "bullet") {
      if (!inList) {
        out.push("\\begin{itemize}");
        inList = true;
      }
      out.push("  \\item " + inlineToLatex(l.text));
    } else if (l.kind === "heading") {
      closeList();
      out.push("\\section*{" + esc(parseInline(l.text).map((s) => s.text).join("")) + "}");
    } else {
      closeList();
      out.push(inlineToLatex(l.text) + " \\\\");
    }
  }
  closeList();

  const header = [
    "\\begin{center}",
    `{\\LARGE\\bfseries ${esc(name)}}\\\\[3pt]`,
    contact ? `{\\small ${esc(contact)}}\\\\[4pt]` : "",
    // The title headline: bold and a step up from body text.
    headline ? `{\\large\\bfseries ${esc(headline)}}` : "",
    "\\end{center}",
    "\\vspace{2pt}",
  ].join("\n");

  return [PREAMBLE, "\\begin{document}", header, out.join("\n"), "\\end{document}"].join("\n");
}

/** Compile a LaTeX document to a PDF buffer via Tectonic. Throws on failure. */
export async function compileLatexToPdf(tex: string): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "te-resume-"));
  try {
    const texPath = join(dir, "resume.tex");
    await writeFile(texPath, tex, "utf8");
    await execFileAsync(
      config.TECTONIC_BIN,
      ["--outdir", dir, "--chatter", "minimal", "--keep-logs", texPath],
      { timeout: config.RESUME_LATEX_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 },
    );
    return await readFile(join(dir, "resume.pdf"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function renderResumeLatexPdf(markdown: string): Promise<Buffer> {
  return compileLatexToPdf(markdownToLatex(markdown));
}
