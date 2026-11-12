import { Resend } from "resend";
import { config } from "../config.js";
import { AppError } from "./errors.js";

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
    // Log Resend's reason for operators; tell the admin what happened instead
    // of a generic 500. The commonest cause is sending from Resend's test
    // address, which only delivers to the Resend account's own email.
    console.error(`[mail] Resend rejected invite to ${params.to}: ${error.message}`);
    throw new AppError(
      502,
      "EMAIL_DELIVERY_FAILED",
      "The email could not be sent. Check that the sending domain is verified in Resend.",
    );
  }
}
