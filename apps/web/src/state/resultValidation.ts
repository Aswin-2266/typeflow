import { TestResultSchema } from "@typeflow/shared/contract"
import type { TestResult } from "@/types"

export function parseStoredResults(value: unknown): TestResult[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((candidate) => {
    const result = TestResultSchema.safeParse(candidate)
    return result.success ? [result.data] : []
  })
}
