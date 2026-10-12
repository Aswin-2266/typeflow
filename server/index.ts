/**
 * API server.
 *
 * A thin Express host for the ts-rest contract. The persistence layer is
 * injected here and nowhere else — swapping `MemoryResultStore` for a
 * database-backed implementation is a single-line change.
 */

import express from "express"
import cors from "cors"
import { createExpressEndpoints } from "@ts-rest/express"
import { contract } from "../shared/contract"
import { createRouter } from "./routes/results"
import { MemoryResultStore } from "./store/memoryStore"

const PORT = Number(process.env["PORT"] ?? 3005)

const app = express()

app.use(cors())
app.use(express.json({ limit: "1mb" }))

// Swap this line to change persistence backends.
const store = new MemoryResultStore()

// Service discovery. Hitting the bare root is the usual way to check whether
// the API is alive, so answer it with something actionable instead of a 404.
app.get("/", (_req, res) => {
  res.json({
    service: "typeflow-api",
    status: "ok",
    storage: "in-memory",
    endpoints: ["GET /health", "GET /api/results", "POST /api/results", "DELETE /api/results"],
  })
})

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

createExpressEndpoints(contract, createRouter(store), app, {
  // Reject payloads that do not match the contract schema.
  responseValidation: false,
  requestValidationErrorHandler: (err, _req, res) => {
    res.status(400).json({
      message: "Request failed validation",
      code: "VALIDATION_ERROR",
      issues: err.body?.issues ?? err.query?.issues ?? [],
    })
  },
})

app.use((_req, res) => {
  res.status(404).json({ message: "Not found", code: "NOT_FOUND" })
})

// Bind on 0.0.0.0 so the service is reachable through the environment's
// public tunnel, not just the loopback interface.
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[api] listening on http://0.0.0.0:${PORT}`)
  console.log("[api] storage: in-memory (data is not durable)")
})

// Allow the dev runner to restart cleanly.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}
