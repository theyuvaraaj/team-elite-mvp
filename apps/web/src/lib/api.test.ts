import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

describe("api error parsing", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads nested error.message and error.code", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      }),
    } as Response);

    await expect(
      api("/api/auth/login", { method: "POST", body: "{}" }),
    ).rejects.toEqual(
      new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS"),
    );
  });

  it("falls back to default message when error body is empty", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(api("/api/example")).rejects.toEqual(
      new ApiError(500, "Something went wrong. Please try again."),
    );
  });
});
