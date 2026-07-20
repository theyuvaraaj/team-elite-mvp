import { buildApp } from "./app.js";
import { config } from "./config.js";

const port = config.PORT;
const host = process.env.HOST ?? "0.0.0.0";

const app = await buildApp();

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
