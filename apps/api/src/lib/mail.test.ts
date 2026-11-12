import { describe, expect, it, vi } from "vitest";

vi.mock("../config.js", () => ({
  config: { RESEND_API_KEY: "re_test", EMAIL_FROM: "Team Elite <onboarding@resend.dev>" },
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async () => ({
        data: null,
        error: { message: "You can only send testing emails to your own email address" },
      }),
    };
  },
}));

const { sendInviteEmail } = await import("./mail.js");

describe("sendInviteEmail", () => {
  it("turns a Resend rejection into a clear 502 instead of a generic 500", async () => {
    const error = await sendInviteEmail({
      to: "someone@example.com",
      name: "Someone",
      setPasswordUrl: "https://app.example.com/set-password?token=x",
    }).catch((e: unknown) => e);
    expect(error).toMatchObject({ statusCode: 502, code: "EMAIL_DELIVERY_FAILED" });
  });
});
