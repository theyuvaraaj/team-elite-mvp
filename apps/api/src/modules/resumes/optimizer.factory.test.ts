import { describe, expect, it, vi } from "vitest";

describe("getOptimizer in production without a key", () => {
  it("returns a GeminiOptimizer (not the stub) so the request fails with a clean 503 instead of fabricating a resume", async () => {
    vi.resetModules();
    vi.doMock("../../config.js", () => ({
      config: {
        NODE_ENV: "production",
        GEMINI_API_KEY: "",
        RESUME_OPTIMIZE_MODEL: "gemini-2.5-flash",
      },
    }));

    const { getOptimizer, GeminiOptimizer, StubOptimizer } = await import("./optimizer.js");
    const optimizer = getOptimizer();

    expect(optimizer).toBeInstanceOf(GeminiOptimizer);
    expect(optimizer).not.toBeInstanceOf(StubOptimizer);

    vi.doUnmock("../../config.js");
    vi.resetModules();
  });
});
