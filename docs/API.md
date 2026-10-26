# API Reference

Base URL: `http://localhost:3005/api`
In development the Vite server proxies `/api` here, so the browser uses
same-origin relative paths.

The contract is defined once in `packages/shared/src/contract.ts` using ts-rest + Zod and
is imported by both the client and the server.

## Conventions

- All payloads are `application/json`
- All timestamps are Unix epoch **milliseconds**
- Durations are **seconds**; percentages are `0`–`100`
- Request bodies are validated against the Zod schema; failures return `400`

---

## `GET /api/health`

Liveness probe.

**Response `200`**
```json
{ "status": "ok", "uptime": 42 }
```

```bash
curl http://localhost:3005/api/health
```

---

## `GET /api/results`

Saved results, newest first.

| Query | Type | Default | Range |
|---|---|---|---|
| `limit` | integer | `100` | 1–1000 |
| `offset` | integer | `0` | >= 0 |

**Response `200`**
```json
{
  "results": [
    {
      "id": "r1-mv4sg9o8",
      "wpm": 82.4,
      "raw": 88.1,
      "accuracy": 94.5,
      "consistency": 77.2,
      "mode": "time",
      "mode2": "30",
      "language": "english",
      "duration": 30,
      "punctuation": false,
      "numbers": false,
      "chars": { "correct": 206, "incorrect": 12, "extra": 0, "missed": 0 },
      "samples": [
        { "second": 1, "wpm": 60, "raw": 66, "errors": 0 }
      ],
      "timestamp": 1791781515512
    }
  ],
  "total": 1
}
```

```bash
curl 'http://localhost:3005/api/results?limit=10&offset=0'
```

---

## `POST /api/results`

Persist a completed test. The server assigns `id` and `timestamp`; sending
them is not required and they are ignored.

**Body** — all fields required

| Field | Type | Notes |
|---|---|---|
| `wpm` | number >= 0 | Net words per minute |
| `raw` | number >= 0 | Gross words per minute |
| `accuracy` | number 0–100 | Percentage |
| `consistency` | number 0–100 | Percentage |
| `mode` | enum | `time` \| `words` \| `quote` \| `zen` \| `custom` |
| `mode2` | string | Mode parameter, e.g. `"30"` |
| `language` | string | e.g. `"english"` |
| `duration` | number >= 0 | Seconds |
| `punctuation` | boolean | |
| `numbers` | boolean | |
| `chars` | object | `{ correct, incorrect, extra, missed }`, all integers >= 0 |
| `samples` | array | `{ second, wpm, raw, errors }` per second |

**Response `201`** — the created result, including `id` and `timestamp`.

**Response `400`**: the payload has the wrong shape.
```json
{ "message": "Request failed validation", "code": "VALIDATION_ERROR", "issues": [] }
```

**Response `400`**: the payload is well-formed but its numbers are inconsistent, for example WPM above 350, raw WPM or accuracy that don't match `chars` and `duration`, or more samples than elapsed seconds. The checks live in `packages/shared/src/plausibility.ts`.
```json
{ "message": "Implausible result: raw wpm does not match character counts", "code": "IMPLAUSIBLE_RESULT" }
```

```bash
curl -X POST http://localhost:3005/api/results \
  -H 'Content-Type: application/json' \
  -d '{
    "wpm": 82.4, "raw": 88.1, "accuracy": 94.5, "consistency": 77.2,
    "mode": "time", "mode2": "30", "language": "english",
    "duration": 30, "punctuation": false, "numbers": false,
    "chars": { "correct": 206, "incorrect": 12, "extra": 0, "missed": 0 },
    "samples": [{ "second": 1, "wpm": 60, "raw": 66, "errors": 0 }]
  }'
```

---

## `DELETE /api/results`

Clear all stored results. This is an admin operation.

- When `ADMIN_TOKEN` is set, the request must send it in the `X-Admin-Token` header.
- When `ADMIN_TOKEN` is unset, deletes are allowed outside production and refused when `NODE_ENV=production`.

```bash
curl -X DELETE http://localhost:3005/api/results -H "X-Admin-Token: $ADMIN_TOKEN"
```

**Response `200`**
```json
{ "deleted": 12 }
```

**Response `403`**
```json
{ "message": "Deleting results requires an admin token", "code": "FORBIDDEN" }
```

---

## Limits

| Scope | Limit |
|---|---|
| All `/api/*` requests | 300 per minute per IP |
| `POST` and `DELETE /api/results` | 30 per minute per IP |
| Request body | 1 MB |

Exceeding a rate limit returns `429` with `{ "message": "Too many requests, slow down", "code": "RATE_LIMITED" }` and standard `RateLimit` headers.

---

## `GET /api/personal-bests`

Best result per `(mode, mode2, language)` grouping, sorted by WPM descending.

**Response `200`**
```json
{
  "bests": [
    {
      "mode": "time", "mode2": "30", "language": "english",
      "wpm": 82.4, "raw": 88.1, "accuracy": 94.5, "consistency": 77.2,
      "timestamp": 1791781515512
    }
  ]
}
```

---

## `GET /api/stats`

Lifetime aggregates.

**Response `200`**
```json
{
  "testsStarted": 1,
  "testsCompleted": 1,
  "timeTyping": 30,
  "averageWpm": 82.4,
  "averageAccuracy": 94.5,
  "highestWpm": 82.4
}
```

`testsStarted` is deprecated. Starts aren't tracked, so it always equals `testsCompleted`. It's kept so existing clients don't break.

---

## Client usage

```ts
import { initClient } from "@ts-rest/core";
import { contract } from "@typeflow/shared/contract";

const client = initClient(contract, { baseUrl: "", baseHeaders: {} });

const res = await client.listResults({ query: { limit: 10, offset: 0 } });
if (res.status === 200) {
  // res.body is fully typed — no casts, no `any`
  console.log(res.body.results);
}
```

## Current limitations

The stub server has **no authentication and no per-user partitioning** — all
results belong to a single implicit user, and data is lost on restart.

See `docs/ROADMAP.md` for the path to persistent, authenticated storage.
