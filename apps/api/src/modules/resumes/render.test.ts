import { describe, expect, it } from "vitest";
import { parseInline, renderResumeDocx, renderResumePdf } from "./render.js";

describe("parseInline", () => {
  it("converts **bold** into bold segments and never leaks raw markers", () => {
    const segs = parseInline("• **Languages & Core:** TypeScript, `Node.js`");
    const joined = segs.map((s) => s.text).join("");
    expect(joined).not.toMatch(/\*\*|__|`/);
    expect(segs.some((s) => s.bold && s.text.includes("Languages & Core:"))).toBe(true);
    expect(joined).toContain("Node.js");
  });

  it("strips markdown links to their label", () => {
    const segs = parseInline("See [my portfolio](https://example.com) here");
    const joined = segs.map((s) => s.text).join("");
    expect(joined).toContain("my portfolio");
    expect(joined).not.toContain("http");
    expect(joined).not.toMatch(/[[\]()]/);
  });
});

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
