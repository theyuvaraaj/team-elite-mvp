import { createHash, randomBytes } from "node:crypto";
import type { PasswordTokenPurpose, Prisma } from "@prisma/client";
import { config } from "../../config.js";
import { sendInviteEmail } from "../../lib/mail.js";

export async function createPasswordToken(
  tx: Prisma.TransactionClient,
  userId: string,
  purpose: PasswordTokenPurpose,
): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(
    Date.now() + config.INVITE_TOKEN_TTL_HOURS * 60 * 60 * 1000,
  );

  await tx.passwordToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  await tx.passwordToken.create({
    data: { userId, tokenHash, purpose, expiresAt },
  });

  return rawToken;
}

export async function deliverPasswordToken(params: {
  to: string;
  name: string;
  rawToken: string;
}): Promise<void> {
  const setPasswordUrl = new URL("/set-password", config.WEB_ORIGIN);
  setPasswordUrl.searchParams.set("token", params.rawToken);
  await sendInviteEmail({
    to: params.to,
    name: params.name,
    setPasswordUrl: setPasswordUrl.toString(),
  });
}
