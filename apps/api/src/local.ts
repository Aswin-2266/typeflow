import { app } from "./app"

const port = Number(process.env["PORT"] ?? 3005)
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[api] listening on http://0.0.0.0:${port}`)
  console.log("[api] storage: in-memory (data is not durable)")
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}
