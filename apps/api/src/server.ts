import argon2 from "argon2";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";

const port = config.PORT;
const host = process.env.HOST ?? "0.0.0.0";

// First boot of a fresh database: create the admin from the environment so
// production never needs the demo seed. Does nothing once any admin exists.
if ((await prisma.user.count({ where: { role: "ADMIN" } })) === 0) {
  await prisma.user.create({
    data: {
      name: "Admin",
      email: config.SEED_ADMIN_EMAIL,
      passwordHash: await argon2.hash(config.SEED_ADMIN_PASSWORD),
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`Created initial admin ${config.SEED_ADMIN_EMAIL}`);
}

const app = await buildApp();

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
