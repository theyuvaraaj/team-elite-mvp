import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";

interface Line { kind: "name" | "heading" | "bullet" | "text"; text: string }
export interface InlineSegment { text: string; bold: boolean }

// Strip markdown noise that should never render literally (links, code ticks,
// stray emphasis markers) from a plain (non-bold) text run.
function clean(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [label](url) -> label
    .replace(/`+/g, "") // inline code ticks
    .replace(/\*+/g, "") // stray emphasis asterisks
    .replace(/\s+/g, " ");
}

// Split a markdown line into bold / non-bold segments, converting **x** and
// __x__ into real bold and cleaning everything else. Never leaks raw markers.
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const re = /(\*\*|__)(.+?)\1/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ text: clean(text.slice(last, match.index)), bold: false });
    }
    segments.push({ text: clean(match[2]), bold: true });
    last = re.lastIndex;
  }
  if (last < text.length) {
    segments.push({ text: clean(text.slice(last)), bold: false });
  }
  const trimmed = segments.filter((s) => s.text.length > 0);
  return trimmed.length ? trimmed : [{ text: clean(text), bold: false }];
}

// Parse canonical markdown into a flat, ATS-friendly line list. The first
// non-empty line is always the name (even if it starts with '#').
function parse(markdown: string): Line[] {
  const raw = markdown.replace(/\r\n/g, "\n").split("\n");
  const lines: Line[] = [];
  let started = false;
  for (const original of raw) {
    const line = original.trim();
    if (!line) continue;
    if (!started) {
      lines.push({ kind: "name", text: line.replace(/^#+\s*/, "") });
      started = true;
    } else if (line.startsWith("#")) {
      lines.push({ kind: "heading", text: line.replace(/^#+\s*/, "") });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      lines.push({ kind: "bullet", text: line.slice(2) });
    } else {
      lines.push({ kind: "text", text: line });
    }
  }
  return lines;
}

function docxRuns(text: string, base?: { size?: number; bold?: boolean }): TextRun[] {
  return parseInline(text).map(
    (s) => new TextRun({ text: s.text, bold: base?.bold || s.bold, size: base?.size }),
  );
}

export async function renderResumeDocx(markdown: string): Promise<Buffer> {
  const children = parse(markdown).map((l) => {
    if (l.kind === "name") {
      return new Paragraph({ children: docxRuns(l.text, { bold: true, size: 32 }) });
    }
    if (l.kind === "heading") {
      return new Paragraph({ heading: HeadingLevel.HEADING_2, children: docxRuns(l.text) });
    }
    if (l.kind === "bullet") {
      return new Paragraph({ bullet: { level: 0 }, children: docxRuns(l.text) });
    }
    return new Paragraph({ children: docxRuns(l.text) });
  });
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export function renderResumePdf(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    function writeSegments(
      segments: InlineSegment[],
      size: number,
      opts: PDFKit.Mixins.TextOptions & { forceBold?: boolean; upper?: boolean },
    ) {
      doc.fontSize(size);
      segments.forEach((s, i) => {
        doc.font(opts.forceBold || s.bold ? "Helvetica-Bold" : "Helvetica");
        const value = opts.upper ? s.text.toUpperCase() : s.text;
        doc.text(value, { ...opts, continued: i < segments.length - 1 });
      });
    }

    for (const l of parse(markdown)) {
      if (l.kind === "name") {
        writeSegments(parseInline(l.text), 18, { forceBold: true });
      } else if (l.kind === "heading") {
        doc.moveDown(0.5);
        writeSegments(parseInline(l.text), 13, { forceBold: true, upper: true });
      } else if (l.kind === "bullet") {
        writeSegments([{ text: "• ", bold: false }, ...parseInline(l.text)], 10.5, { indent: 12 });
      } else {
        writeSegments(parseInline(l.text), 10.5, {});
      }
    }
    doc.end();
  });
}
