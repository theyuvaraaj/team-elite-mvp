import mammoth from "mammoth";
import { AppError } from "../../lib/errors.js";

export interface UploadedFile { buffer: Buffer; filename: string; mimetype: string }

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function ext(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export async function parseResumeFile(file: UploadedFile): Promise<string> {
  const type = file.mimetype;
  const e = ext(file.filename);
  let text = "";

  try {
    if (type === "application/pdf" || e === "pdf") {
      // pdf-parse v2 is class-based: `new PDFParse({ data }).getText()`.
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
      const result = await parser.getText();
      text = result.text;
    } else if (type === DOCX || e === "docx") {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else if (type.startsWith("text/") || e === "txt") {
      text = file.buffer.toString("utf8");
    } else {
      throw new AppError(400, "UNSUPPORTED_FILE", "Upload a PDF, DOCX, or text resume");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "RESUME_PARSE_FAILED", "Could not read that file; try exporting it again");
  }

  text = text.replace(/\r\n/g, "\n").trim();
  if (text.length === 0) {
    throw new AppError(400, "EMPTY_RESUME", "Could not read any text from that file");
  }
  return text;
}
