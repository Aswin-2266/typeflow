/**
 * Route handlers.
 *
 * Handlers depend only on the `ResultStore` interface, never on a concrete
 * implementation. Request and response bodies are validated against the
 * shared ts-rest contract, so a schema change cannot silently break either
 * side of the wire.
 */

import { timingSafeEqual } from "node:crypto"
import type { Request } from "express"
import { initServer } from "@ts-rest/express"
import { contract } from "@typeflow/shared/contract"
import { checkResultPlausibility } from "@typeflow/shared/plausibility"
import type { ResultStore } from "../store/memoryStore"

const s = initServer()

/** Header carrying the admin token for destructive operations. */
export const ADMIN_TOKEN_HEADER = "x-admin-token"

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Destructive operations are allowed when:
 * - `ADMIN_TOKEN` is set and the request carries the matching header, or
 * - `ADMIN_TOKEN` is unset and the server is not running in production,
 *   so local development keeps working without configuration.
 */
export function isAdminRequest(req: Request): boolean {
  const configured = process.env["ADMIN_TOKEN"]?.trim()
  if (!configured) return process.env["NODE_ENV"] !== "production"

  const provided = req.header(ADMIN_TOKEN_HEADER)
  return typeof provided === "string" && safeEqual(provided, configured)
}

export function createRouter(store: ResultStore) {
  const startedAt = Date.now()

  return s.router(contract, {
    health: async () => ({
      status: 200 as const,
      body: {
        status: "ok" as const,
        uptime: Math.round((Date.now() - startedAt) / 1000),
      },
    }),

    listResults: async ({ query }) => {
      const { results, total } = await store.list(query.limit, query.offset)
      return { status: 200 as const, body: { results, total } }
    },

    createResult: async ({ body }) => {
      const implausible = checkResultPlausibility(body)
      if (implausible) {
        return {
          status: 400 as const,
          body: { message: `Implausible result: ${implausible}`, code: "IMPLAUSIBLE_RESULT" },
        }
      }

      try {
        const result = await store.create(body)
        return { status: 201 as const, body: result }
      } catch (error) {
        return {
          status: 400 as const,
          body: {
            message: error instanceof Error ? error.message : "Invalid result payload",
            code: "INVALID_RESULT",
          },
        }
      }
    },

    deleteResults: async ({ req }) => {
      if (!isAdminRequest(req)) {
        return {
          status: 403 as const,
          body: { message: "Deleting results requires an admin token", code: "FORBIDDEN" },
        }
      }

      const deleted = await store.clear()
      return { status: 200 as const, body: { deleted } }
    },

    personalBests: async () => {
      const bests = await store.personalBests()
      return { status: 200 as const, body: { bests } }
    },

    stats: async () => {
      const stats = await store.stats()
      return { status: 200 as const, body: stats }
    },
  })
}
