import { Resend } from "resend";
import { config } from "../config.js";

export async function sendInviteEmail(params: {
  to: string;
  name: string;
  setPasswordUrl: string;
}): Promise<void> {
  if (!config.RESEND_API_KEY) {
    console.info(
      `[invite] ${params.name} <${params.to}>: ${params.setPasswordUrl}`,
    );
    return;
  }

  const resend = new Resend(config.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: config.EMAIL_FROM,
    to: params.to,
    subject: "You are invited to Team Elite",
    text: [
      `Hi ${params.name},`,
      "",
      "You have been invited to Team Elite.",
      `Set your password: ${params.setPasswordUrl}`,
    ].join("\n"),
  });

  if (error) {
    throw new Error(`Failed to send invite email: ${error.message}`);
  }
}
