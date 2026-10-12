/**
 * API server.
 *
 * A thin Express host for the ts-rest contract. The persistence layer is
 * injected here and nowhere else — swapping `MemoryResultStore` for a
 * database-backed implementation is a single-line change.
 */

import express from "express";
import cors from "cors";
import { createExpressEndpoints } from "@ts-rest/express";
import { contract } from "../shared/contract";
import { createRouter } from "./routes/results";
import { MemoryResultStore } from "./store/memoryStore";

const PORT = Number(process.env["PORT"] ?? 3005);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Swap this line to change persistence backends.
const store = new MemoryResultStore();

createExpressEndpoints(contract, createRouter(store), app, {
  // Reject payloads that do not match the contract schema.
  responseValidation: false,
  requestValidationErrorHandler: (err, _req, res) => {
    res.status(400).json({
      message: "Request failed validation",
      code: "VALIDATION_ERROR",
      issues: err.body?.issues ?? err.query?.issues ?? [],
    });
  },
});

app.use((_req, res) => {
  res.status(404).json({ message: "Not found", code: "NOT_FOUND" });
});

const server = app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] storage: in-memory (data is not durable)`);
});

// Allow the dev runner to restart cleanly.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
