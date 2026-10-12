/**
 * Route handlers.
 *
 * Handlers depend only on the `ResultStore` interface, never on a concrete
 * implementation. Request and response bodies are validated against the
 * shared ts-rest contract, so a schema change cannot silently break either
 * side of the wire.
 */

import { initServer } from "@ts-rest/express";
import { contract } from "../../shared/contract";
import type { ResultStore } from "../store/memoryStore";

const s = initServer();

export function createRouter(store: ResultStore) {
  const startedAt = Date.now();

  return s.router(contract, {
    health: async () => ({
      status: 200 as const,
      body: {
        status: "ok" as const,
        uptime: Math.round((Date.now() - startedAt) / 1000),
      },
    }),

    listResults: async ({ query }) => {
      const { results, total } = await store.list(query.limit, query.offset);
      return { status: 200 as const, body: { results, total } };
    },

    createResult: async ({ body }) => {
      try {
        const result = await store.create(body);
        return { status: 201 as const, body: result };
      } catch (error) {
        return {
          status: 400 as const,
          body: {
            message: error instanceof Error ? error.message : "Invalid result payload",
            code: "INVALID_RESULT",
          },
        };
      }
    },

    deleteResults: async () => {
      const deleted = await store.clear();
      return { status: 200 as const, body: { deleted } };
    },

    personalBests: async () => {
      const bests = await store.personalBests();
      return { status: 200 as const, body: { bests } };
    },

    stats: async () => {
      const stats = await store.stats();
      return { status: 200 as const, body: stats };
    },
  });
}
