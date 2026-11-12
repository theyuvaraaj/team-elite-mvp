import { z } from "zod";

/**
 * A password an admin sets on someone else's account. When present on an
 * invite, the account can sign in straight away and no invite email is sent.
 * Same minimum as a password the user sets for themselves.
 */
export const adminChosenPassword = z.string().min(8).max(128).optional();
