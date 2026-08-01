import { describe, expect, it } from "vitest";
import { renderResumeDocx, renderResumePdf } from "./render.js";

const md = "Jane Doe\njane@example.com\n\n## Summary\nGreat engineer.\n\n## Skills\nTypeScript, Kubernetes\n\n## Experience\n- Built things.";

describe("renderResumeDocx", () => {
  it("produces a non-empty docx buffer with the zip signature", async () => {
    const buf = await renderResumeDocx(md);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK"); // docx is a zip
  });
});

describe("renderResumePdf", () => {
  it("produces a non-empty pdf buffer with the pdf header", async () => {
    const buf = await renderResumePdf(md);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
