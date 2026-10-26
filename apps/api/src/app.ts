import cors, { type CorsOptions } from "cors"
import express from "express"
import { rateLimit } from "express-rate-limit"
import { createExpressEndpoints } from "@ts-rest/express"
import { contract } from "@typeflow/shared/contract"
import { createRouter } from "./routes/results"
import { MemoryResultStore } from "./store/memoryStore"

function allowedOrigins(): string[] {
  return (process.env["FRONTEND_URLS"] ?? process.env["FRONTEND_URL"] ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)
}

function corsOptions(): CorsOptions {
  const configured = allowedOrigins()

  return {
    origin(origin, callback) {
      if (!origin || configured.length === 0 || configured.includes(origin.replace(/\/$/, ""))) {
        callback(null, true)
        return
      }

      callback(new Error("Origin is not allowed by CORS"))
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Admin-Token"],
  }
}

export function createApp() {
  const app = express()
  const store = new MemoryResultStore()

  app.disable("x-powered-by")
  // Behind Vercel / a single reverse proxy, so the client IP is one hop away.
  // Without this every request would share the proxy's IP for rate limiting.
  app.set("trust proxy", 1)
  app.use(cors(corsOptions()))
  // A 3-hour zen session produces ~10,800 samples (~600 KB), so keep headroom.
  app.use(express.json({ limit: "1mb" }))

  const limiterDefaults = {
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests, slow down", code: "RATE_LIMITED" },
  } as const

  // Broad ceiling on all API traffic.
  app.use("/api", rateLimit({ ...limiterDefaults, windowMs: 60_000, limit: 300 }))
  // Writes are far rarer for a real user (one per finished test).
  const writeLimiter = rateLimit({ ...limiterDefaults, windowMs: 60_000, limit: 30 })
  app.post("/api/results", writeLimiter)
  app.delete("/api/results", writeLimiter)

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

  return app
}

export const app = createApp()
