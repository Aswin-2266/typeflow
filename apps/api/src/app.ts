import cors, { type CorsOptions } from "cors"
import express from "express"
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
    allowedHeaders: ["Content-Type"],
  }
}

export function createApp() {
  const app = express()
  const store = new MemoryResultStore()

  app.disable("x-powered-by")
  app.use(cors(corsOptions()))
  app.use(express.json({ limit: "1mb" }))

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
