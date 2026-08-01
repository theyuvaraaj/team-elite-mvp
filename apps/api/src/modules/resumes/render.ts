import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";

interface Line { kind: "name" | "heading" | "bullet" | "text"; text: string }

// Parse canonical markdown into a flat, ATS-friendly line list.
function parse(markdown: string): Line[] {
  const raw = markdown.replace(/\r\n/g, "\n").split("\n");
  const lines: Line[] = [];
  let seenContent = false;
  for (const original of raw) {
    const line = original.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      lines.push({ kind: "heading", text: line.replace(/^#+\s*/, "") });
      seenContent = true;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      lines.push({ kind: "bullet", text: line.slice(2) });
      seenContent = true;
    } else if (!seenContent) {
      lines.push({ kind: lines.length === 0 ? "name" : "text", text: line });
    } else {
      lines.push({ kind: "text", text: line });
    }
  }
  return lines;
}

export async function renderResumeDocx(markdown: string): Promise<Buffer> {
  const children = parse(markdown).map((l) => {
    if (l.kind === "name") return new Paragraph({ children: [new TextRun({ text: l.text, bold: true, size: 32 })] });
    if (l.kind === "heading") return new Paragraph({ text: l.text, heading: HeadingLevel.HEADING_2 });
    if (l.kind === "bullet") return new Paragraph({ text: l.text, bullet: { level: 0 } });
    return new Paragraph({ text: l.text });
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
    for (const l of parse(markdown)) {
      if (l.kind === "name") doc.font("Helvetica-Bold").fontSize(18).text(l.text);
      else if (l.kind === "heading") doc.moveDown(0.5).font("Helvetica-Bold").fontSize(13).text(l.text.toUpperCase());
      else if (l.kind === "bullet") doc.font("Helvetica").fontSize(10.5).text("• " + l.text, { indent: 12 });
      else doc.font("Helvetica").fontSize(10.5).text(l.text);
    }
    doc.end();
  });
}
