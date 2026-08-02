import { describe, expect, it } from "vitest";
import { markdownToLatex } from "./latex.js";

describe("markdownToLatex", () => {
  const tex = markdownToLatex(
    [
      "# Jane & Co",
      "jane@example.com | +1 555-0100",
      "## Skills",
      "- **C++ & Rust:** 100% coverage, R&D",
      "## Experience",
      "**Acme** | Engineer | 2021-2025",
      "- Delivered $5M in savings",
    ].join("\n"),
  );

  it("wraps a complete, document-shaped LaTeX file", () => {
    expect(tex).toContain("\\documentclass");
    expect(tex).toContain("\\begin{document}");
    expect(tex).toContain("\\end{document}");
    expect(tex).toContain("\\section*{Skills}");
    expect(tex).toContain("\\begin{itemize}");
    expect(tex).toContain("\\end{itemize}");
  });

  it("escapes LaTeX special characters", () => {
    expect(tex).toContain("Jane \\& Co");
    expect(tex).toContain("100\\% coverage");
    expect(tex).toContain("R\\&D");
    expect(tex).toContain("\\$5M");
  });

  it("converts **bold** to \\textbf and never leaks raw markdown markers", () => {
    expect(tex).toContain("\\textbf{C\\+\\+ \\& Rust:}".replace(/\\\+/g, "+")); // '+' is not escaped
    expect(tex).toContain("\\textbf{Acme}");
    expect(tex).not.toContain("**");
    expect(tex).not.toContain("__");
  });
});
