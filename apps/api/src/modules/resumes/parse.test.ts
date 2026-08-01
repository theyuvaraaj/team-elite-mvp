import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseResumeFile } from "./parse.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("parseResumeFile", () => {
  it("extracts text from a DOCX", async () => {
    const buffer = readFileSync(join(here, "__fixtures__/sample.docx"));
    const text = await parseResumeFile({ buffer, filename: "sample.docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    expect(text).toContain("Jane Doe");
    expect(text).toContain("TypeScript");
  });

  it("extracts text from a PDF", async () => {
    const buffer = readFileSync(join(here, "__fixtures__/sample.pdf"));
    const text = await parseResumeFile({ buffer, filename: "sample.pdf", mimetype: "application/pdf" });
    expect(text).toContain("Jane Doe");
    expect(text).toContain("TypeScript");
  });

  it("accepts plain text", async () => {
    const text = await parseResumeFile({ buffer: Buffer.from("Hello World resume"), filename: "r.txt", mimetype: "text/plain" });
    expect(text).toContain("Hello World");
  });

  it("rejects unsupported types", async () => {
    await expect(
      parseResumeFile({ buffer: Buffer.from("x"), filename: "r.png", mimetype: "image/png" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
  });

  it("rejects empty extraction", async () => {
    await expect(
      parseResumeFile({ buffer: Buffer.from("   "), filename: "r.txt", mimetype: "text/plain" }),
    ).rejects.toMatchObject({ code: "EMPTY_RESUME" });
  });
});
