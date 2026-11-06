import pg from "pg";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";

const { Pool } = pg;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4000);
  const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
  const app = await createApp({ pool, closePool: true });
  try {
    await app.listen({ host: "0.0.0.0", port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
